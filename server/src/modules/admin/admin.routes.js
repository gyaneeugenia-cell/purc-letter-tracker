import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { departments, users } from '../../utils/sampleData.js';

export const adminRouter = Router();
const assignableRoles = ['NORMAL_USER', 'SYSTEM_ADMIN'];
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

// Never expose password or security-answer hashes.
function sanitize(user) {
  const { passwordHash, securityAnswerHash, resetAttempts, resetLockUntil, ...safe } = user;
  return safe;
}

function requireSystemAdmin(req, res, next) {
  if (req.user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ message: 'SYSTEM_ADMIN role is required for this action' });
  }
  next();
}

adminRouter.get('/users', (req, res) => {
  res.json({
    data: users.map(sanitize),
    total: users.length
  });
});

// Edit a user's information. Admins may edit anyone; everyone else may edit
// only their own account.
adminRouter.patch('/users/:id', (req, res) => {
  const target = users.find((item) => item.id === req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });

  const isSelf = req.user?.id === target.id;
  const isAdmin = req.user?.role === 'SYSTEM_ADMIN';
  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: 'You can only edit your own information' });
  }

  const { name, email, title, department } = req.body || {};

  if (name !== undefined) {
    const value = String(name).trim();
    if (!value) return res.status(400).json({ message: 'Name cannot be empty' });
    target.name = value;
    target.avatar = value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }
  if (email !== undefined) {
    const value = String(email).trim();
    if (!isValidEmail(value)) return res.status(400).json({ message: 'Please enter a valid email address' });
    if (users.some((u) => u.id !== target.id && u.email.toLowerCase() === value.toLowerCase())) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }
    target.email = value;
  }
  if (title !== undefined) target.title = String(title).trim();
  if (department !== undefined) target.department = String(department).trim();

  res.json({ data: sanitize(target) });
});

adminRouter.get('/departments', (req, res) => {
  res.json({ data: departments, total: departments.length });
});

adminRouter.post('/users', requireSystemAdmin, (req, res) => {
  const { name, email, role = 'NORMAL_USER', department = 'Executive Secretary', title = 'Officer', password = 'Password123!' } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
  if (!assignableRoles.includes(role)) return res.status(400).json({ message: 'Role must be Admin or Normal User' });
  if (users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }
  const created = {
    id: uuid(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    department,
    title,
    avatar: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  };
  users.push(created);
  res.status(201).json({ data: sanitize(created) });
});

adminRouter.patch('/users/:id/role', requireSystemAdmin, (req, res) => {
  const user = users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { role } = req.body;
  if (!assignableRoles.includes(role)) {
    return res.status(400).json({ message: 'Role must be Admin or Normal User' });
  }
  if (user.id === req.user.id && role !== 'SYSTEM_ADMIN') {
    return res.status(400).json({ message: 'You cannot remove admin access from your own active account' });
  }

  user.role = role;
  res.json({ data: sanitize(user) });
});

adminRouter.delete('/users/:id', requireSystemAdmin, (req, res) => {
  const index = users.findIndex((user) => user.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'User not found' });
  if (users[index].id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own active administrator account' });
  }
  const [deleted] = users.splice(index, 1);
  res.json({ data: sanitize(deleted) });
});
