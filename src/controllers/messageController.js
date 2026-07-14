const pool = require('../config/db');

// 📜 جيب آخر الرسائل في روم معين (pagination بسيطة بالـ before cursor)
async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params;
    const { before } = req.query;
    const limit = 30;

    let query = `
      SELECT m.id, m.content, m.created_at, m.sender_id,
             u.name AS sender_name, u.avatar_color AS sender_avatar_color
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = $1
    `;
    const params = [roomId];

    if (before) {
      query += ' AND m.created_at < $2';
      params.push(before);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ' + limit;

    const result = await pool.query(query, params);
    // نرجعهم بترتيب تصاعدي عشان يتعرضوا صح في الشات
    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('GetRoomMessages error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

module.exports = { getRoomMessages };
