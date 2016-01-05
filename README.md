# ratelimit-middleware [![Build Status](https://travis-ci.org/defunctzombie/ratelimit-middleware.svg?branch=master)](https://travis-ci.org/defunctzombie/ratelimit-middleware)

Rate limit middleware for [expressjs](http://expressjs.com/)

```js
var ratelimit = require('ratelimit-middleware');
var app = express();

app.use(ratelimit({
    burst: 10,  // Max 10 concurrent requests (if tokens)
    rate: 0.5  // Steady state: 1 request / 2 seconds
});

app.get('/throttled/access', function(req, res, next) {
    ...
});
```

## ratelimit(options)

Creates an API rate limiter that can be plugged into the standard
restify request handling pipeline.

This throttle gives you three options on which to throttle:
username, IP address and 'X-Forwarded-For'. IP/XFF is a /32 match,
so keep that in mind if using it.  Username takes the user specified
on req.username (which gets automagically set for supported Authorization
types; otherwise set it yourself with a filter that runs before this).

In both cases, you can set a `burst` and a `rate` (in requests/seconds),
as an integer/float.  Those really translate to the `TokenBucket`
algorithm, so read up on that (or see the comments above...).

In either case, the top level options burst/rate set a blanket throttling
rate, and then you can pass in an `overrides` object with rates for
specific users/IPs.  You should use overrides sparingly, as we make a new
TokenBucket to track each.

### Options

| Name | Default | Type | Description |
| --- | --- | --- | --- |
| rate | - | Number | Steady state number of requests/second to allow |
| burst | - | Number | Amount of requests to burst to |
| ip | true | Boolean | Throttle on /32 (source id) |
| xff | false | Boolean | Throttle on /32 X-Forwarded-For header |
| username | false | Boolean | Throttle on req.username |
| overrides | null | Object | Per "key" overrides |
| tokensTable | - | Object | Storage engine |
| maxKeys | 10000 | Number | Maximum distinct throttling keys to allow at a time |

### Overrides

```js
{
    burst: 10,
    rate: 0.5,
    ip: true,
    overrides: {
        '192.168.1.1': {
            burst: 0,
            rate: 0    // unlimited
        },
        '192.168.1.192/27': {
            burst: 0,
            rate: 0
        }
      }
   }
}
```

## Handle Ratelimit errors

If a request with exceed the rate limit and cannot be processed, the `next` middleware will be invoked with an `Error` argument. The error instance will have a `status` field with code `429` and a `message` indicating the user has exceeded their quota `You have exceeded your request rate of %s r/s.`

You can handle this response by providing error handling middleware in your express app.

```js
var app = express();

app.use(ratelimit({ ... });

app.use(...);
app.get(...);

app.use(function(err, req, res, next) {
   err.status // will be 429 if rate limited

   // example way to respond
   // NOTE, you will likely want to hide `err.message` for 5xx errors in production.
   res.status(err.status || 500).send(err.message);
});
```

## Prior art

This module is repackaged code from the [restify](http://restifyjs.com/) library [throttle plugin](https://github.com/mcavage/node-restify/blob/master/lib/plugins/throttle.js) for use with expressjs

## License

MIT

See LICENSE.restify for restify's license.
