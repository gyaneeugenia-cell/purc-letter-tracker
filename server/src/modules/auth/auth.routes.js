import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { users } from '../../utils/sampleData.js';
import { authenticate, signUserToken } from '../../middleware/auth.js';

export const authRouter = Router();

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

authRouter.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});
