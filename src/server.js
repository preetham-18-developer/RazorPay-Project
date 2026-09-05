const express = require('express');
const path = require('path');
const healthRouter = require('./routes/health');
const disputesRouter = require('./routes/disputes');
const webhooksRouter = require('./routes/webhooks');
const reviewsRouter = require('./routes/reviews');
const freshmartRouter = require('./routes/freshmart');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware: Capture rawBody buffer for HMAC SHA256 signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Serve static frontend build assets from client/dist if present
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/health', healthRouter);
app.use('/disputes', disputesRouter);
app.use('/disputes', reviewsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/freshmart', freshmartRouter);


// SPA Client Catch-All Route for HTML navigation (FreshMart & DisputeShield UI)
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        next();
      }
    });
  }
  next();
});

// 404 Route Handler for non-HTML/API requests
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`[DisputeShield Server] Running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;

