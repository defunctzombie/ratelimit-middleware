var assert = require('assert');
var after = require('after');
var express = require('express');
var supertest = require('supertest');

var ratelimit = require('../');

describe('ratelimit', function() {
    it('should perform basic ratelimiting on ip', function(done) {
        done = after(2, done);

        var app = express();
        app.use(ratelimit({
            burst: 1,
            rate: 1,
            ip: true
        }));

        app.get('/', function(req, res, next) {
            res.send('hello');
        });

        app.use(error_handler);

        supertest(app)
        .get('/')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .expect(429)
        .end(function(err, res) {
            assert.equal(res.text, 'You have exceeded your request rate of 1 r/s.');
            done(err);
        });
    });

    it('should perform basic ratelimiting on xff', function(done) {
        done = after(3, done);

        var app = express();
        app.use(ratelimit({
            burst: 1,
            rate: 1,
            xff: true
        }));

        app.get('/', function(req, res, next) {
            res.send('hello');
        });

        app.use(error_handler);

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.2')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(429)
        .end(function(err, res) {
            assert.equal(res.text, 'You have exceeded your request rate of 1 r/s.');
            done(err);
        });
    });

    it('should let ip addresses be used as override keys', function(done) {
        done = after(2, done);

        var app = express();
        app.use(ratelimit({
            burst: 1,
            rate: 1,
            xff: true,
            overrides: {
                '1.1.1.1': {
                    burst: 2,
                    rate: 2
                }
            }
        }));

        app.get('/', function(req, res, next) {
            res.send('hello');
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });
    });

    it('should let ip blocks be used as override keys', function(done) {
        done = after(2, done);

        var app = express();
        app.use(ratelimit({
            burst: 1,
            rate: 1,
            xff: true,
            overrides: {
                '1.1.1.192/27': {
                    burst: 2,
                    rate: 2
                }
            }
        }));

        app.get('/', function(req, res, next) {
            res.send('hello');
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.223')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.223')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });
    });

    it('should not apply a block rate limit to an IP that falls outside its range', function(done) {
        done = after(2, done);

        var app = express();
        app.use(ratelimit({
            burst: 1,
            rate: 1,
            xff: true,
            overrides: {
                '1.1.1.192/27': {
                    burst: 2,
                    rate: 2
                }
            }
        }));

        app.get('/', function(req, res, next) {
            res.send('hello');
        });

        app.use(error_handler);

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(200)
        .end(function(err, res) {
            done(err);
        });

        supertest(app)
        .get('/')
        .set('x-forwarded-for', '1.1.1.1')
        .expect(429)
        .end(function(err, res) {
            assert.equal(res.text, 'You have exceeded your request rate of 1 r/s.');
            done(err);
        });
    });
});

function error_handler(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
};
