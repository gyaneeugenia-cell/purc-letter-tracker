import { Router } from 'express';
import { createRequire } from 'module';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { letters, auditLogs } from '../../utils/sampleData.js';

const require = createRequire(import.meta.url);
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch { /* pdf-parse unavailable */ }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, '../../../uploads');

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuid()}-${file.originalname}`)
});
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const extractUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// --- extraction helpers ---

const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

function extractDate(text) {
  const m1 = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i);
  if (m1) return `${m1[3]}-${MONTHS[m1[2].toLowerCase()]}-${String(m1[1]).padStart(2, '0')}`;
  const m2 = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (m2) return `${m2[3]}-${MONTHS[m2[1].toLowerCase()]}-${String(m2[2]).padStart(2, '0')}`;
  const m3 = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m3) return `${m3[3]}-${String(m3[2]).padStart(2, '0')}-${String(m3[1]).padStart(2, '0')}`;
  const m4 = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m4) return `${m4[1]}-${m4[2]}-${m4[3]}`;
  return '';
}

function extractReference(text) {
  const m1 = text.match(/(?:our\s+ref(?:erence)?|your\s+ref(?:erence)?|ref(?:erence)?\s*(?:no\.?|number)?|ref\.\s*no\.?)[\s:–-]+([A-Z0-9][A-Z0-9/\-._ ]{2,40})/i);
  if (m1) return m1[1].trim();
  const m2 = text.match(/\b(PURC\/[A-Z0-9\/\-.]+)\b/i);
  if (m2) return m2[1].trim();
  return '';
}

function extractSubject(text) {
  const m = text.match(/(?:re(?:ference)?|subject|subj(?:ect)?)\s*[:–-]\s*(.{5,120}?)(?:\n|$)/i);
  if (m) return m[1].trim();
  return '';
}

function extractSignatory(text) {
  const m = text.match(/(?:yours\s+(?:faithfully|sincerely|truly)|signed|regards)\s*[,.\n]+\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i);
  if (m) return m[1].trim();
  return '';
}

function extractSenderOrganization(text) {
  const known = [
    'Electricity Company of Ghana', 'ECG', 'NEDCO', 'Ghana Water Company', 'GWCL',
    'Northern Electricity Distribution Company', 'Energy Commission', 'Ministry of Energy',
    'Public Utilities Regulatory Commission', 'PURC', 'Volta River Authority', 'VRA',
    'Ghana Grid Company', 'GRIDCo', 'Bui Power Authority', 'BPA',
    'Ghana National Petroleum Corporation', 'GNPC', 'National Petroleum Authority', 'NPA',
    'Environmental Protection Agency', 'EPA', 'Ghana Revenue Authority', 'GRA',
    'Ministry of Finance', 'Attorney General', 'Office of the President'
  ];
  for (const org of known) {
    if (text.toLowerCase().includes(org.toLowerCase())) return org;
  }
  // Try first few lines — usually the letterhead
  const firstLines = text.split('\n').slice(0, 6).join(' ');
  const m = firstLines.match(/([A-Z][a-zA-Z\s&,().'-]{8,60}(?:Limited|Ltd|Corporation|Corp|Authority|Commission|Company|Ministry|Office|Board|Agency|Department))/);
  if (m) return m[1].trim();
  return '';
}

async function extractTextFromBuffer(buffer, mimetype) {
  if (mimetype === 'application/pdf' && pdfParse) {
    const result = await pdfParse(buffer, { max: 3 });
    return result.text || '';
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // DOCX is a ZIP — extract word/document.xml and strip XML tags
    try {
      const str = buffer.toString('binary');
      const start = str.indexOf('PK'); // ZIP magic bytes present
      if (start >= 0) {
        // Simple: find all w:t content (Word text runs) in the raw bytes using regex
        const xmlStr = buffer.toString('utf8');
        const textMatches = xmlStr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        return textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
      }
    } catch { /* ignore */ }
  }
  return '';
}

export const documentsRouter = Router();

documentsRouter.post('/extract', extractUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A valid PDF or DOCX file is required' });
  try {
    const text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    if (!text || text.trim().length < 20) {
      return res.json({ data: {}, message: 'Could not extract readable text from this document.' });
    }
    const fields = {
      letterDate: extractDate(text),
      trackingNumber: extractReference(text),
      subject: extractSubject(text),
      senderOrganization: extractSenderOrganization(text),
      sender: extractSignatory(text)
    };
    return res.json({ data: fields });
  } catch (err) {
    return res.json({ data: {}, message: 'Extraction failed. Please fill the fields manually.' });
  }
});

documentsRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A valid PDF, image, or DOCX file is required' });
  const letter = letters.find((item) => item.id === req.body.letterId);
  if (letter) letter.attachments = Math.max(Number(letter.attachments || 0), 1);
  auditLogs.unshift({
    id: uuid(),
    action: 'DOCUMENT_UPLOADED',
    actor: req.user?.name || 'System',
    entity: letter?.trackingNumber || req.body.letterId || 'Unassigned',
    severity: 'INFO',
    at: new Date().toISOString(),
    ip: req.ip
  });
  res.status(201).json({
    data: {
      id: uuid(),
      fileName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype
    }
  });
});
