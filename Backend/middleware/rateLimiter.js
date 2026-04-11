const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter to prevent general DoS attacks.
 * Limits each IP to 100 requests per 15 minutes.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

/**
 * Stricter rate limiter for sensitive authentication routes (Login, Signup, etc.).
 * Limits each IP to 5 requests per 1 minute.
 */
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per 1 minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many authentication attempts, please try again after a minute'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};
