import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { auditLogs, letters } from '../../utils/sampleData.js';

export const reportsRouter = Router();

const reportDefinitions = [
  { code: 'LETTER_VOLUME', name: 'Letter Volume', description: 'Received letters and letters prepared for external dispatch by period.' },
  { code: 'ES_DISPATCH_CONTROL', name: 'ES Dispatch Control', description: 'Letters pending dispatch at ES and letters dispatched internally or externally.' },
  { code: 'DEPARTMENT_WORKLOAD', name: 'Directorate Workload', description: 'Official letters grouped by responsible directorate.' },
  { code: 'AUDIT_ACTIVITY', name: 'Audit Activity', description: 'Security and operational activity trail.' }
];

const statusLabels = {
  ES_RECEIVED: 'Pending internal dispatch',
  READY_FOR_SIGNATURE: 'Pending external dispatch',
  DISPATCHED_TO_DEPARTMENT: 'Dispatched internally',
  DISPATCHED: 'Dispatched externally',
  ARCHIVED: 'Archived'
};

function monthKey(letter) {
  const value = letter.letterDate || letter.receivedAt || letter.dispatchedAt || letter.createdAt;
  return value ? new Date(value).toISOString().slice(0, 7) : 'No date';
}

function letterDestination(letter) {
  if (letter.type === 'OUTGOING') return letter.recipient || '-';
  return letter.routeDepartment || letter.currentDepartment || '-';
}

function workloadDepartment(letter) {
  if (letter.type === 'OUTGOING') return letter.routeDepartment || letter.sender || 'Unassigned';
  return letter.routeDepartment || letter.currentDepartment || 'Unassigned';
}

function displayType(letter) {
  return letter.type === 'INCOMING' ? 'Received' : 'Prepared for external dispatch';
}

function groupedRows(items, keyFn) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function reportRows(code) {
  if (code === 'LETTER_VOLUME') {
    return groupedRows(letters, monthKey).map(([period]) => {
      const periodLetters = letters.filter((letter) => monthKey(letter) === period);
      const incoming = periodLetters.filter((letter) => letter.type === 'INCOMING').length;
      const outgoing = periodLetters.filter((letter) => letter.type === 'OUTGOING').length;
      return [period, `Received: ${incoming}`, `Prepared for external dispatch: ${outgoing}`, `Total: ${periodLetters.length}`];
    });
  }

  if (code === 'ES_DISPATCH_CONTROL') {
    return letters
      .filter((letter) => ['ES_RECEIVED', 'READY_FOR_SIGNATURE', 'DISPATCHED_TO_DEPARTMENT', 'DISPATCHED'].includes(letter.status))
      .sort((a, b) => String(a.status).localeCompare(String(b.status)) || String(a.trackingNumber).localeCompare(String(b.trackingNumber)))
      .map((letter) => [
        letter.trackingNumber,
        displayType(letter),
        statusLabels[letter.status] || letter.status,
        letterDestination(letter),
        letter.subject
      ]);
  }

  if (code === 'DEPARTMENT_WORKLOAD') {
    return groupedRows(letters, workloadDepartment).map(([department]) => {
      const departmentLetters = letters.filter((letter) => workloadDepartment(letter) === department);
      const incoming = departmentLetters.filter((letter) => letter.type === 'INCOMING').length;
      const outgoing = departmentLetters.filter((letter) => letter.type === 'OUTGOING').length;
      return [department, `Received: ${incoming}`, `Prepared for external dispatch: ${outgoing}`, `Total: ${departmentLetters.length}`];
    });
  }

  if (code === 'AUDIT_ACTIVITY') {
    return auditLogs
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .map((log) => [
        new Date(log.at).toLocaleString(),
        log.actor,
        log.action,
        log.entity
      ]);
  }

  return letters.map((letter) => [
    letter.trackingNumber,
    displayType(letter),
    statusLabels[letter.status] || letter.status,
    letter.subject
  ]);
}

function reportHeaders(code) {
  if (code === 'LETTER_VOLUME') return ['Period', 'Received', 'Prepared for External Dispatch', 'Total'];
  if (code === 'ES_DISPATCH_CONTROL') return ['Reference No', 'Type', 'Status', 'Destination', 'Subject'];
  if (code === 'DEPARTMENT_WORKLOAD') return ['Directorate', 'Received', 'Prepared for External Dispatch', 'Total'];
  if (code === 'AUDIT_ACTIVITY') return ['Time', 'Actor', 'Action', 'Reference No'];
  return ['Reference No', 'Type', 'Status', 'Subject'];
}

function drawReport(doc, report) {
  const headers = reportHeaders(report.code);
  const rows = reportRows(report.code);

  doc.fontSize(18).text(report.name);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#64748b').text(report.description);
  doc.fillColor('#0f172a');
  doc.moveDown();
  doc.fontSize(10).font('Helvetica-Bold').text(headers.join(' | '));
  doc.font('Helvetica').moveDown(0.3);

  if (!rows.length) {
    doc.text('No records available for this report.');
    return;
  }

  rows.forEach((row) => {
    const line = row.map((cell) => String(cell ?? '-')).join(' | ');
    doc.text(line, { lineGap: 3 });
  });
}

reportsRouter.get('/summary', (req, res) => {
  res.json({
    reports: reportDefinitions
  });
});

reportsRouter.get('/export/pdf', (req, res) => {
  const report = reportDefinitions.find((item) => item.code === req.query.report) || {
    code: 'FULL_REPORT',
    name: 'PURC Letter Tracking Report',
    description: 'Complete official letter tracking export.'
  };
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${report.code.toLowerCase()}-report.pdf"`);

  const doc = new PDFDocument({ margin: 48 });
  doc.pipe(res);
  drawReport(doc, report);
  doc.end();
});

reportsRouter.get('/export/excel', (req, res) => {
  const escapeXml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const headers = ['Reference Number', 'Registry Number', 'Type', 'Subject', 'Status', 'Directorate', 'Priority'];
  const rows = letters.map((letter) => [
    letter.trackingNumber,
    letter.registryNumber || '',
    displayType(letter),
    letter.subject,
    statusLabels[letter.status] || letter.status,
    letter.currentDepartment,
    letter.priority
  ]);
  const cells = [headers, ...rows].map((row) =>
    `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`
  ).join('');
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Letters"><Table>${cells}</Table></Worksheet>
</Workbook>`;

  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', 'attachment; filename="purc-letter-tracking-report.xls"');
  res.send(workbook);
});
