/**
 * server.js
 * ----------
 * Entry point for the Rubbish Revamp backend server.
 * Starts the Express app on the configured PORT.
 * Does NOT force a database connection at startup.
 */

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('  ♻️  Rubbish Revamp API');
  console.log(`  ➜  Running on   : http://localhost:${PORT}`);
  console.log(`  ➜  Health check : http://localhost:${PORT}/api/health`);
  console.log(`  ➜  DB health    : http://localhost:${PORT}/api/health/db`);
  console.log(`  ➜  Environment  : ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});
