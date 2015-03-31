function xor() {
    var x = 0;
    for (var i = 0; i < arguments.length; ++i) {
        // ~~ turns the boolean into a 1 or 0
        x ^= ~~arguments[i];
    }
    return x > 0;
}

module.exports = xor;
