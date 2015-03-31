var assert = require('assert');

var xor = require('../lib/xor');

describe('xor', function() {
    it('should handle T T', function() {
        assert.equal(xor(true, true), false);
    });

    it('should handle F F', function() {
        assert.equal(xor(false, false), false);
    });

    it('should handle T F', function() {
        assert.equal(xor(true, false), true);
    });

    it('should handle F T', function() {
        assert.equal(xor(false, true), true);
    });

    it('should handle T T F', function() {
        assert.equal(xor(true, true, false), false);
    });
});
