const pool = require('../config/db');

// 📋 جيب كل الرومات اللي المستخدم عضو فيها
async function getMyRooms(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.created_at,
              (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id) AS members_count
       FROM rooms r
       JOIN room_members rm ON rm.room_id = r.id
       WHERE rm.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('GetMyRooms error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// ➕ إنشاء روم جديد (المنشئ بيبقى عضو أوتوماتيك)
async function createRoom(req, res) {
  const client = await pool.connect();
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '⚠️ اسم الروم مطلوب' });
    }

    await client.query('BEGIN');

    const roomResult = await client.query(
      'INSERT INTO rooms (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.user.id]
    );
    const room = roomResult.rows[0];

    await client.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [room.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: '🎉 تم إنشاء الروم', room });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CreateRoom error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  } finally {
    client.release();
  }
}

// 🚪 الانضمام لروم موجود
async function joinRoom(req, res) {
  try {
    const { roomId } = req.params;

    const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (room.rows.length === 0) {
      return res.status(404).json({ message: '❌ الروم مش موجود' });
    }

    await pool.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, req.user.id]
    );

    res.json({ message: '✅ انضميت للروم', room: room.rows[0] });
  } catch (err) {
    console.error('JoinRoom error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// 👥 أعضاء الروم (مفيدة للـ @mention autocomplete في الفرونت)
async function getRoomMembers(req, res) {
  try {
    const { roomId } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_color
       FROM users u
       JOIN room_members rm ON rm.user_id = u.id
       WHERE rm.room_id = $1`,
      [roomId]
    );
    res.json({ members: result.rows });
  } catch (err) {
    console.error('GetRoomMembers error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

module.exports = { getMyRooms, createRoom, joinRoom, getRoomMembers };
