const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const { app, corsOptions } = require('./app');
const initSocket = require('./socket');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const server = http.createServer(app);
  const io = initSocket(server, corsOptions);

  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${env.port} is already in use.` : err.message);
    process.exit(1);
  });
  server.listen(env.port, () => console.log(`Server running on port ${env.port} (${env.nodeEnv})`));

  // Render sends SIGTERM on deploys/restarts: stop accepting connections, then close the DB.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    io.close();
    server.close(() => mongoose.connection.close(false).finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Log unexpected errors without crashing on a single bad request; exit on truly fatal ones.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

start();
