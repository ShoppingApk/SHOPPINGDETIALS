const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render/Vercel sit behind a proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);
// Flat query strings only: "?a[b]=1" stays a plain string key instead of becoming an object,
// which closes off query-based NoSQL operator injection at the parser level.
app.set('query parser', 'simple');
app.disable('x-powered-by');

const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser tools (curl, uptime pingers) that send no Origin header.
    if (!origin || env.clientUrls.includes(origin.replace(/\/$/, ''))) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(
  helmet({
    // JSON API only: lock the CSP right down and never allow framing.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    referrerPolicy: { policy: 'no-referrer' },
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . keys to block NoSQL injection
// HTTP parameter pollution: "?a=1&a=2" would arrive as an array; keep only the last value
// so every query parameter is a plain string, as the validators expect.
app.use((req, res, next) => {
  for (const [k, v] of Object.entries(req.query)) if (Array.isArray(v)) req.query[k] = v[v.length - 1];
  next();
});
if (!env.isProd) app.use(morgan('dev'));

// Health check: used by Render and by free uptime pingers to keep the service awake.
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes); // 404 for everyone except active chatusers

app.use(notFound);
app.use(errorHandler);

module.exports = { app, corsOptions };
