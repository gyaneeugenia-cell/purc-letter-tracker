import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { departments, users } from '../../utils/sampleData.js';

export const adminRouter = Router();
const assignableRoles = ['NORMAL_USER', 'SYSTEM_ADMIN'];

function requireSystemAdmin(req, res, next) {
  if (req.user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ message: 'SYSTEM_ADMIN role is required for this action' });
  }
  next();
}

adminRouter.get('/users', (req, res) => {
  res.json({
    data: users.map(({ passwordHash, ...user }) => user),
    total: users.length
  });
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
  const { passwordHash, ...safeUser } = created;
  res.status(201).json({ data: safeUser });
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
  const { passwordHash, ...safeUser } = user;
  res.json({ data: safeUser });
});

adminRouter.delete('/users/:id', requireSystemAdmin, (req, res) => {
  const index = users.findIndex((user) => user.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'User not found' });
  if (users[index].id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own active administrator account' });
  }
  const [deleted] = users.splice(index, 1);
  const { passwordHash, ...safeUser } = deleted;
  res.json({ data: safeUser });
});
