const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// 🧩 استخراج أسماء المستخدمين المذكورين بـ @ في الرسالة
function extractMentions(content) {
  const matches = content.match(/@(\w+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

function initSocket(io) {
  // 🔐 التحقق من الـ token قبل ما نسمح بالاتصال أصلاً
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('🚫 مفيش token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, name, email }
      next();
    } catch (err) {
      next(new Error('⛔ token غير صالح'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 اتصل: ${socket.user.name} (${socket.id})`);

    // 🚪 دخول روم
    socket.on('room:join', async (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('room:user_online', {
        userId: socket.user.id,
        name: socket.user.name,
      });
    });

    // 🚪 خروج من روم
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
    });

    // ✉️ إرسال رسالة
    socket.on('message:send', async ({ roomId, content }) => {
      try {
        if (!content || !content.trim()) return;

        // 1) نحفظ الرسالة في Postgres
        const result = await pool.query(
          `INSERT INTO messages (room_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, created_at`,
          [roomId, socket.user.id, content.trim()]
        );
        const savedMessage = result.rows[0];

        const messagePayload = {
          id: savedMessage.id,
          content: savedMessage.content,
          created_at: savedMessage.created_at,
          room_id: roomId,
          sender_id: socket.user.id,
          sender_name: socket.user.name,
        };

        // 2) نبعتها realtime لكل أعضاء الروم (بما فيهم اللي بعتها لتأكيد الاستلام)
        io.to(roomId).emit('message:new', messagePayload);

        // 3) نتحقق من الـ mentions ونبعت notification
        const mentionedNames = extractMentions(content);
        if (mentionedNames.length > 0) {
          const membersResult = await pool.query(
            `SELECT u.id, u.name FROM users u
             JOIN room_members rm ON rm.user_id = u.id
             WHERE rm.room_id = $1`,
            [roomId]
          );

          for (const member of membersResult.rows) {
            const isMentioned = mentionedNames.includes(
              member.name.toLowerCase().replace(/\s+/g, '')
            );
            if (isMentioned && member.id !== socket.user.id) {
              const notifResult = await pool.query(
                `INSERT INTO notifications (user_id, type, room_id, message_id, content)
                 VALUES ($1, 'mention', $2, $3, $4)
                 RETURNING id, type, content, is_read, created_at`,
                [
                  member.id,
                  roomId,
                  savedMessage.id,
                  `${socket.user.name} ذكرك في رسالة 💬`,
                ]
              );

              // نبعت الإشعار realtime لو المستخدم متصل (لأي tab فاتح عنده)
              io.to(`user:${member.id}`).emit('notification:new', notifResult.rows[0]);
            }
          }
        }
      } catch (err) {
        console.error('❌ message:send error:', err);
        socket.emit('error:message', { message: 'حصل خطأ في إرسال الرسالة' });
      }
    });

    // ⌨️ مؤشر "بيكتب دلوقتي"
    socket.on('typing:start', (roomId) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user.id,
        name: socket.user.name,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (roomId) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user.id,
        name: socket.user.name,
        isTyping: false,
      });
    });

    // 🧑 كل مستخدم بينضم لروم خاص بيه عشان يستقبل إشعاراته الشخصية
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      console.log(`❌ قطع الاتصال: ${socket.user.name}`);
    });
  });
}

module.exports = initSocket;
