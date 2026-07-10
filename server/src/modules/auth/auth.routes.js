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

authRouter.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const transport = getTransporter();
  if (!transport) {
    return res.status(503).json({
      message: 'Password reset by email is not set up yet. Please contact the administrator directly.'
    });
  }

  const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' });

  try {
    // 1) Notify the administrator of the reset request.
    await transport.sendMail({
      from: `PURC Letter Tracker <${env.smtpUser}>`,
      to: env.adminEmail,
      subject: 'PURC Tracker — Password reset request',
      text: `A password reset was requested for: ${email}\nAccount on file: ${userExists ? 'Yes' : 'No'}\nTime: ${when}\n\nPlease reset this user's password in the Users section.`
    });
    // 2) Acknowledge to the requester.
    await transport.sendMail({
      from: `PURC Letter Tracker <${env.smtpUser}>`,
      to: email,
      subject: 'PURC Tracker — We received your password reset request',
      text: `Hello,\n\nWe received a request to reset your PURC Letter Tracker password. The system administrator has been notified and will reset it for you shortly.\n\nIf you did not make this request, you can safely ignore this email.\n\n— PURC Executive Secretariat`
    });

    return res.json({ message: 'Reset request sent. Check your email for confirmation, and the administrator will follow up.' });
  } catch (error) {
    console.error('Password reset email failed:', error?.message || error);
    return res.status(502).json({ message: 'We could not send the reset email right now. Please try again later or contact the administrator.' });
  }
});

authRouter.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});
