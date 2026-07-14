import { Router } from 'express';
import { auditLogs } from '../../utils/sampleData.js';

export const auditRouter = Router();

function requireSystemAdmin(req, res, next) {
  if (req.user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ message: 'SYSTEM_ADMIN role is required for this action' });
  }
  next();
}

auditRouter.get('/', (req, res) => {
  res.json({ data: auditLogs, total: auditLogs.length });
});

// Clear every audit entry (admin only).
auditRouter.delete('/', requireSystemAdmin, (req, res) => {
  const removed = auditLogs.length;
  auditLogs.length = 0;
  res.json({ removed });
});

// Delete a single audit entry (admin only).
auditRouter.delete('/:id', requireSystemAdmin, (req, res) => {
  const index = auditLogs.findIndex((log) => log.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Audit log entry not found' });
  const [deleted] = auditLogs.splice(index, 1);
  res.json({ data: deleted });
});
