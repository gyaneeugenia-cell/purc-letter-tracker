import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { users } from '../utils/sampleData.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = users.find((user) => user.id === payload.sub) || payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function signUserToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, department: user.department },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}
