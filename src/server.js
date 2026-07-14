require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const { pubClient, subClient, connectRedis } = require('./config/redis');
const initSocket = require('./sockets/socketHandler');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// 🌍 CORS + JSON body parsing
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// ❤️ Health check - مهم جداً لـ DevOps (Docker healthcheck / load balancer)
app.get('/health', (req, res) => {
  res.json({ status: '✅ ok', timestamp: new Date().toISOString() });
});

// 📡 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/notifications', notificationRoutes);

// 🧯 404 handler
app.use((req, res) => {
  res.status(404).json({ message: '❌ الصفحة مش موجودة' });
});

// 🧯 Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '❌ حصل خطأ غير متوقع في السيرفر' });
});

// 🔌 Socket.io setup
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*' },
});

async function start() {
  try {
    // نوصل Redis الأول، وبنستخدمه كـ adapter لـ Socket.io
    // ده اللي بيخلي أكتر من backend instance يقدروا يتبادلوا رسائل الـ sockets مع بعض
    await connectRedis();
    io.adapter(createAdapter(pubClient, subClient));

    initSocket(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 السيرفر شغال على بورت ${PORT}`);
    });
  } catch (err) {
    console.error('❌ فشل تشغيل السيرفر:', err);
    process.exit(1);
  }
}

start();
