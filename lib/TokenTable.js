var assert = require('assert-plus');
var LRU = require('lru-cache');

// Just a wrapper over LRU that supports put/get to store token -> bucket
// mappings

function TokenTable(options) {
    assert.object(options, 'options');

    this.table = new LRU(options.size || 10000);
}

TokenTable.prototype.put = function put(key, value) {
    this.table.set(key, value);
};

TokenTable.prototype.get = function get(key) {
    return (this.table.get(key));
};

module.exports = TokenTable;
