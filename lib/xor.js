function xor() {
    var x = false;
    for (var i = 0; i < arguments.length; ++i) {
        if (arguments[i] && !x) {
            x = true;
        }
        else if (arguments[i] && x) {
            return false;
        }
    }
    return x;
}

module.exports = xor;
