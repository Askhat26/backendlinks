const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Appearance = require('../models/Appearance');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username: lowercase alphanumeric + underscore only' });
    }

    const emailLower = email.toLowerCase();
    const usernameLower = username.toLowerCase();

    if (await User.findOne({ email: emailLower })) return res.status(400).json({ error: 'Email taken' });
    if (await User.findOne({ username: usernameLower })) return res.status(400).json({ error: 'Username taken' });

    const user = await User.create({ name, email: emailLower, username: usernameLower, password });
    await Appearance.create({ userId: user._id });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        plan: user.plan,
        role: user.role
      },
    });
  } catch (err) {
    console.error('AUTH ERROR (REGISTER):', err);

    // optional but recommended: handle duplicate keys nicely
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      return res.status(400).json({ error: `${field} already exists` });
    }

    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || user.isBanned) return res.status(400).json({ error: 'Invalid credentials' });

    if (!user.password) {
      return res.status(400).json({ error: 'Account password is missing. Please reset or re-register.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        plan: user.plan,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('AUTH ERROR (LOGIN):', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/me', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;