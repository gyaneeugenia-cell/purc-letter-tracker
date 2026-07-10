import { Router } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { v4 as uuid } from 'uuid';
import { users } from '../../utils/sampleData.js';
import { env } from '../../config/env.js';
import { authenticate, signUserToken } from '../../middleware/auth.js';

export const authRouter = Router();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

// Lazily create the Gmail transporter (only when credentials are configured).
let transporter = null;
function getTransporter() {
  if (!env.smtpUser || !env.smtpPass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.smtpUser, pass: env.smtpPass }
    });
  }
  return transporter;
}

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((item) => item.email.toLowerCase() === String(email || '').toLowerCase());

  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({ token: signUserToken(user), user: safeUser });
});

authRouter.post('/register', (req, res) => {
  const { name, email, password, department = 'Executive Secretary', title = 'Officer' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
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
    avatar: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  };
  users.push(created);

  const { passwordHash, ...safeUser } = created;
  res.status(201).json({ token: signUserToken(created), user: safeUser });
});

// In-memory reset tokens: token -> { email, expires }. Cleared on use/expiry.
const resetTokens = new Map();
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function purgeExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of resetTokens) {
    if (entry.expires < now) resetTokens.delete(token);
  }
}

// Self-service: the user enters their email and receives a reset link directly.
authRouter.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const transport = getTransporter();
  if (!transport) {
    return res.status(503).json({
      message: 'Email delivery is not switched on yet. Ask the administrator to add the email settings, then try again.'
    });
  }

  purgeExpiredTokens();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  // Only actually send when the account exists, but always reply the same way
  // so the form never reveals which emails are registered.
  if (user) {
    const token = uuid();
    resetTokens.set(token, { email: user.email, expires: Date.now() + RESET_TTL_MS });
    const base = process.env.PUBLIC_URL
      || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
    const link = `${base}/reset-password?token=${token}`;
    try {
      await transport.sendMail({
        from: `PURC Letter Tracker <${env.smtpUser}>`,
        to: user.email,
        subject: 'Reset your PURC Letter Tracker password',
        text: `Hello,\n\nWe received a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour.\n\n${link}\n\nIf you did not request this, you can safely ignore this email — your password will stay the same.\n\n— PURC Letter Tracker`,
        html: `<p>Hello,</p><p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p><p><a href="${link}" style="display:inline-block;background:#465ba8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Reset my password</a></p><p>Or copy this link:<br>${link}</p><p>If you did not request this, you can safely ignore this email — your password will stay the same.</p><p>— PURC Letter Tracker</p>`
      });
    } catch (error) {
      console.error('Password reset email failed:', error?.message || error);
      return res.status(502).json({ message: 'We could not send the email right now. Please try again in a moment.' });
    }
  }

  return res.json({ message: 'If that email is registered, a password reset link is on its way. Please check your inbox (and spam folder).' });
});

// Complete the reset using the emailed token.
authRouter.post('/reset-password', (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  purgeExpiredTokens();
  const entry = resetTokens.get(token);
  if (!entry) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const user = users.find((u) => u.email.toLowerCase() === entry.email.toLowerCase());
  if (!user) {
    resetTokens.delete(token);
    return res.status(400).json({ message: 'We could not find that account. Please request a new reset link.' });
  }

  user.passwordHash = bcrypt.hashSync(password, 10);
  resetTokens.delete(token);
  return res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
});

authRouter.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});
