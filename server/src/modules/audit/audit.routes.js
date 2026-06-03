import { Router } from 'express';
import { auditLogs } from '../../utils/sampleData.js';

export const auditRouter = Router();

auditRouter.get('/', (req, res) => {
  res.json({ data: auditLogs, total: auditLogs.length });
});
