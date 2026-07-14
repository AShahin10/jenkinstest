const { Pool } = require('pg');
require('dotenv').config();

// 🐘 Pool واحد للاتصال بـ Postgres، بيتشارك بين كل الـ requests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected Postgres error:', err);
});

module.exports = pool;
