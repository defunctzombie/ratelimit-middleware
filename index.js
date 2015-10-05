var sprintf = require('util').format;
var assert = require('assert-plus');

var xor = require('./lib/xor');
var TokenTable = require('./lib/TokenTable');
var TokenBucket = require('./lib/TokenBucket');
var Netmask = require('netmask').Netmask;

/**
 * Creates an API rate limiter that can be plugged into the standard
 * restify request handling pipeline.
 *
 * This throttle gives you three options on which to throttle:
 * username, IP address and 'X-Forwarded-For'. IP/XFF is a /32 match,
 * so keep that in mind if using it.  Username takes the user specified
 * on req.username (which gets automagically set for supported Authorization
 * types; otherwise set it yourself with a filter that runs before this).
 *
 * In both cases, you can set a `burst` and a `rate` (in requests/seconds),
 * as an integer/float.  Those really translate to the `TokenBucket`
 * algorithm, so read up on that (or see the comments above...).
 *
 * In either case, the top level options burst/rate set a blanket throttling
 * rate, and then you can pass in an `overrides` object with rates for
 * specific users/IPs.  You should use overrides sparingly, as we make a new
 * TokenBucket to track each.
 *
 * On the `options` object ip and username are treated as an XOR.
 *
 * An example options object with overrides:
 *
 *  {
 *    burst: 10,  // Max 10 concurrent requests (if tokens)
 *    rate: 0.5,  // Steady state: 1 request / 2 seconds
 *    ip: true,   // throttle per IP
 *    overrides: {
 *      '192.168.1.1': {
 *        burst: 0,
 *        rate: 0    // unlimited
 *    }
 *  }
 *
 *
 * @param {Object} options required options with:
 *                   - {Number} burst (required).
 *                   - {Number} rate (required).
 *                   - {Boolean} ip (optional).
 *                   - {Boolean} username (optional).
 *                   - {Boolean} xff (optional).
 *                   - {Object} overrides (optional).
 *                   - {Object} tokensTable: a storage engine this plugin will
 *                              use to store throttling keys -> bucket mappings.
 *                              If you don't specify this, the default is to
 *                              use an in-memory O(1) LRU, with 10k distinct
 *                              keys.  Any implementation just needs to support
 *                              put/get.
 *                   - {Number} maxKeys: If using the default implementation,
 *                              you can specify how large you want the table to
 *                              be.  Default is 10000.
 * @return {Function} of type f(req, res, next) to be plugged into a route.
 * @throws {TypeError} on bad input.
 */
function throttle(options) {
    assert.object(options, 'options');
    assert.number(options.burst, 'options.burst');
    assert.number(options.rate, 'options.rate');
    if (!xor(options.ip, options.xff, options.username)) {
        throw new Error('(ip ^ username ^ xff)');
    }

    for (key in options.overrides) {
        var override = options.overrides[key];
        try {
            var block = new Netmask(key);

            // Non-/32 blocks only
            if (block.first !== block.last) {
                override.block = block;
            }
        }
        catch(err) {
            // The key may be a username, which would raise but should
            // be ignored
        }
    }

    var message = options.message || 'You have exceeded your request rate of %s r/s.';

    var table = options.tokensTable || new TokenTable({size: options.maxKeys});

    function rateLimit(req, res, next) {
        var attr;
        var burst = options.burst;
        var rate = options.rate;

        if (options.ip) {
            attr = req.connection.remoteAddress;
        } else if (options.xff) {
            attr = req.headers['x-forwarded-for'];
        } else if (options.username) {
            attr = req.username;
        }

        // Before bothering with overrides, see if this request
        // even matches
        if (!attr) {
            return next(new Error('Invalid throttle configuration'));
        }

        // Check the overrides
        if (options.overrides) {
            var override = options.overrides[attr];

            // If the rate limit attribute matches an override key, apply it
            if (override) {
                if (override.burst !== undefined && override.rate !== undefined) {
                    burst = override.burst;
                    rate = override.rate;
                }
            }

            // Otherwise, see if the rate limit attribute matches any CIDR
            // block overrides
            else {
                for (key in options.overrides) {
                    override = options.overrides[key];

                    // If the attr is a comma-delimited list of IPs, get the first
                    attr = attr.split(',')[0];
                    var contained = false;

                    try {
                        contained = override.block && override.block.contains(attr);
                    }
                    catch(err) {
                        // attr may be a username, which would raise but should
                        // be ignored
                    }

                    if (contained) {
                        burst = override.burst;
                        rate = override.rate;
                        break;
                    }
                }
            }
        }

        if (!rate || !burst) {
            return next();
        }

        var bucket = table.get(attr);
        if (!bucket) {
            bucket = new TokenBucket({
                capacity: burst,
                fillRate: rate
            });
            table.put(attr, bucket);
        }

        if (!bucket.consume(1)) {
            var msg = sprintf(message, rate);
            var err = new Error(msg);
            err.status = 429; // Too Many Requests
            return next(err);
        }

        return next();
    }

    return rateLimit;
}

module.exports = throttle;
