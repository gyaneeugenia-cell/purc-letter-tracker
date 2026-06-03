import { Router } from 'express';
import { notifications } from '../../utils/sampleData.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', (req, res) => {
  res.json({ data: notifications, unread: notifications.filter((item) => item.unread).length });
});

notificationsRouter.patch('/:id/read', (req, res) => {
  const notification = notifications.find((item) => item.id === req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  notification.unread = false;
  res.json({ data: notification });
});
