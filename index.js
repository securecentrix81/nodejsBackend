// server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: '*',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Create proxy middleware
const proxy = createProxyMiddleware({
  // Dynamic target based on request
  router: (req) => {
    // Extract original target from custom header or query param
    const target = req.headers['x-proxy-target'] || req.query.target;
    if (!target) {
      throw new Error('Target URL not specified. Use X-Proxy-Target header or ?target= query param.');
    }
    return target;
  },
  // Change the origin of the host header to the target URL
  changeOrigin: true,
  // Enable WebSocket proxying
  ws: true,
  // Path rewrite: remove the /proxy prefix
  pathRewrite: {
    '^/proxy': '' // Removes the /proxy path segment
  },
  // Secure: false if you need to proxy to HTTPS with self-signed certs
  secure: false,
  // Log proxy activity
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to: ${proxyReq.getHeader('host')}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response received: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Apply proxy to all routes under /proxy
app.use('/proxy', proxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Use endpoint: http://localhost:${PORT}/proxy?target=YOUR_TARGET_URL`);
});
