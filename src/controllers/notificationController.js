const pool = require('../config/db');

// 🔔 جيب إشعارات المستخدم (الأحدث الأول)
async function getMyNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT n.id, n.type, n.content, n.is_read, n.created_at,
              n.room_id, r.name AS room_name
       FROM notifications n
       LEFT JOIN rooms r ON r.id = n.room_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('GetMyNotifications error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// ✅ علّم إشعار كمقروء
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: '✅ تم التحديث' });
  } catch (err) {
    console.error('MarkAsRead error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// ✅✅ علّم كل الإشعارات كمقروءة
async function markAllAsRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: '✅ تم تحديث كل الإشعارات' });
  } catch (err) {
    console.error('MarkAllAsRead error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
