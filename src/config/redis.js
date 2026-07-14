const { createClient } = require('redis');
require('dotenv').config();

// 🟥 عميلين منفصلين لـ Socket.io adapter (pub/sub لازم يكونوا منفصلين)
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('❌ Redis (pub) error:', err));
subClient.on('error', (err) => console.error('❌ Redis (sub) error:', err));

async function connectRedis() {
  await pubClient.connect();
  await subClient.connect();
  console.log('✅ Redis connected (pub/sub)');
}

module.exports = { pubClient, subClient, connectRedis };
