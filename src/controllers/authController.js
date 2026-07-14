const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const AVATAR_COLORS = ['#6C8EBF', '#82A878', '#B98EA7', '#C9A66B', '#7B9EA8'];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// 📝 تسجيل مستخدم جديد
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: '⚠️ من فضلك املأ كل الحقول' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '⚠️ الباسورد لازم يكون 6 حروف على الأقل' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: '📧 الإيميل ده مستخدم قبل كده' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, avatar_color, created_at`,
      [name, email, passwordHash, avatarColor]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ message: '🎉 تم إنشاء الحساب بنجاح', user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// 🔑 تسجيل الدخول
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '⚠️ من فضلك دخل الإيميل والباسورد' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: '❌ الإيميل أو الباسورد غلط' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: '❌ الإيميل أو الباسورد غلط' });
    }

    const token = generateToken(user);
    delete user.password_hash;

    res.json({ message: '✅ تم تسجيل الدخول', user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

// 👤 بيانات المستخدم الحالي
async function getMe(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_color, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ المستخدم مش موجود' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: '❌ حصل خطأ في السيرفر' });
  }
}

module.exports = { register, login, getMe };
