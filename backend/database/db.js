const { Pool } = require('pg');
require('dotenv').config();

// Determine whether SSL should be used for the Postgres connection.
// Priority:
// 1. If DATABASE_SSL is set, honor it (true/false).
// 2. If the DATABASE_URL looks like a Render-hosted database, enable SSL.
// 3. Fall back to enabling SSL when NODE_ENV === 'production'.
const shouldUseSSL = (() => {
  if (process.env.DATABASE_SSL) {
    return String(process.env.DATABASE_SSL).toLowerCase() === 'true';
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')) {
    // Render Postgres requires SSL for external connections.
    return true;
  }
  return process.env.NODE_ENV === 'production';
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
});

// Initialize database schema
async function initializeDatabase() {
  try {
    const fs = require('fs');
    const path = require('path');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = { pool, initializeDatabase };


