const rateLimit = require('express-rate-limit');

const REALTIME_ROUTE_PREFIXES = [
    '/api/orders',
    '/api/debts',
    '/api/analytics',
    '/api/canteens',
    '/api/payments'
];

/**
 * Standard API rate limiter to prevent general DoS attacks.
 * Tuned higher so real-time dashboard refreshes and Socket.IO-driven
 * follow-up fetches do not trip the limiter during normal usage.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Allow healthy dashboard polling/re-fetch bursts from the same IP
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        const hasAuthHeader = Boolean(req.headers.authorization);
        const isRealtimeRoute = REALTIME_ROUTE_PREFIXES.some((prefix) => req.path.startsWith(prefix));

        // Authenticated dashboard/order traffic can legitimately spike during rush hour,
        // so do not count it against the shared public API bucket.
        return hasAuthHeader && isRealtimeRoute;
    },
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
