const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

// ===== IN-MEMORY DATABASE (STABLE) =====
const users = [];

// ===== TOKEN =====
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

// ===== HEALTH CHECK =====
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend working perfectly 🚀' });
});

// ===== REGISTER =====
app.post('/auth/register', (req, res) => {
  try {
    console.log('REGISTER:', req.body);

    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Missing fields'
      });
    }

    const exists = users.find(u => u.email === email);
    if (exists) {
      return res.status(400).json({
        ok: false,
        error: 'User already exists'
      });
    }

    const user = {
      id: `user-${Date.now()}`,
      fullName,
      email,
      password
    };

    users.push(user);

    const token = generateToken(user);

    res.json({
      ok: true,
      token,
      user
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ ok: false, error: 'Server crash' });
  }
});

// ===== LOGIN =====
app.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user);

    res.json({
      ok: true,
      token,
      user
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ ok: false, error: 'Server crash' });
  }
});

// ===== INTERVIEW (SAFE FALLBACK) =====
app.post('/interview/respond', (req, res) => {
  try {
    const { answer } = req.body;

    const score = answer.length > 50 ? 'strong' : 'weak';

    const response =
      score === 'strong'
        ? 'Good answer. Can you go deeper into your impact?'
        : 'Try structuring your answer using STAR method.';

    res.json({
      ok: true,
      feedback: response,
      score
    });

  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});