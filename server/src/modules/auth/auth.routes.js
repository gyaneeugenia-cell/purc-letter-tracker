import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { users } from '../../utils/sampleData.js';
import { authenticate, signUserToken } from '../../middleware/auth.js';

export const authRouter = Router();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
// Normalise answers so "Accra", " accra " and "ACCRA" all match.
const normalizeAnswer = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const DEFAULT_SECURITY_QUESTION = 'In which city is PURC headquartered?';

// Make sure every in-memory account has a security question (covers local runs
// without a database; the database path sets this during persistence startup).
users.forEach((u) => {
  if (!u.securityQuestion || !u.securityAnswerHash) {
    u.securityQuestion = DEFAULT_SECURITY_QUESTION;
    u.securityAnswerHash = bcrypt.hashSync('accra', 10);
  }
});

// Never leak the password hash, security-answer hash, or lockout bookkeeping.
function sanitize(user) {
  const { passwordHash, securityAnswerHash, resetAttempts, resetLockUntil, ...safe } = user;
  return safe;
}

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((item) => item.email.toLowerCase() === String(email || '').toLowerCase());

  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({ token: signUserToken(user), user: sanitize(user) });
});

authRouter.post('/register', (req, res) => {
  const { name, email, password, department = 'Executive Secretary', title = 'Officer', securityQuestion, securityAnswer } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!securityQuestion || !securityAnswer) {
    return res.status(400).json({ message: 'A security question and answer are required (used to reset your password)' });
  }
  if (users.some((item) => item.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const created = {
    id: uuid(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'NORMAL_USER',
    department,
    title,
    securityQuestion: String(securityQuestion).trim(),
    securityAnswerHash: bcrypt.hashSync(normalizeAnswer(securityAnswer), 10),
    avatar: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  };
  users.push(created);

  res.status(201).json({ token: signUserToken(created), user: sanitize(created) });
});

// ── Self-service password reset via a security question (no email needed) ──

// Step 1: look up the security question for an email address.
authRouter.post('/reset/question', (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.securityQuestion) {
    return res.status(404).json({ message: 'No account was found for that email address.' });
  }
  res.json({ question: user.securityQuestion });
});

// Step 2: verify the answer and set a new password. Locks out after 5 wrong tries.
authRouter.post('/reset/verify', (req, res) => {
  const email = String(req.body?.email || '').trim();
  const answer = req.body?.answer;
  const password = String(req.body?.password || '');

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.securityAnswerHash) {
    return res.status(400).json({ message: 'This account cannot be reset here. Please contact your administrator.' });
  }
  if (user.resetLockUntil && user.resetLockUntil > Date.now()) {
    const minutes = Math.ceil((user.resetLockUntil - Date.now()) / 60000);
    return res.status(429).json({ message: `Too many incorrect attempts. Please try again in ${minutes} minute(s).` });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  if (!bcrypt.compareSync(normalizeAnswer(answer), user.securityAnswerHash)) {
    user.resetAttempts = (user.resetAttempts || 0) + 1;
    if (user.resetAttempts >= 5) {
      user.resetLockUntil = Date.now() + 15 * 60 * 1000;
      user.resetAttempts = 0;
      return res.status(429).json({ message: 'Too many incorrect attempts. Please try again in 15 minutes.' });
    }
    return res.status(400).json({ message: 'That answer is incorrect. Please try again.' });
  }

  user.passwordHash = bcrypt.hashSync(password, 10);
  user.resetAttempts = 0;
  delete user.resetLockUntil;
  res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: sanitize(req.user) });
});
