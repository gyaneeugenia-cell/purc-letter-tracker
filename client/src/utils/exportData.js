// Dependency-free export helpers — produce real Excel (.xls) and PDF files
// entirely client-side, so they work in any deployment with no server route
// or third-party library required.
//
// columns: [{ header: string, accessor: (row) => any }]
// rows:    array of data objects
// meta:    { title, periodLabel, subtitle }

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellValue(row, column) {
  const raw = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
  return raw === null || raw === undefined ? '' : String(raw);
}

function timestamp() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function safeFilename(title) {
  return String(title || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── EXCEL (.xls via HTML table — opens natively in Excel / LibreOffice) ──
export function exportToExcel({ title, periodLabel, columns, rows }) {
  const headerCells = columns.map((c) => `<th style="background:#465BA8;color:#fff;border:1px solid #2f3f7a;padding:6px 10px;text-align:left;">${escapeHtml(c.header)}</th>`).join('');
  const bodyRows = rows.map((row) => {
    const cells = columns.map((c) => `<td style="border:1px solid #d0d7e6;padding:5px 10px;">${escapeHtml(cellValue(row, c))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head>
<body>
<table>
  <tr><td colspan="${columns.length}" style="font-size:16px;font-weight:bold;color:#061D3A;">${escapeHtml(title)}</td></tr>
  <tr><td colspan="${columns.length}" style="color:#465BA8;font-weight:bold;">Selected period: ${escapeHtml(periodLabel || 'All Records')}</td></tr>
  <tr><td colspan="${columns.length}" style="color:#64748b;">Generated: ${escapeHtml(timestamp())} &nbsp;|&nbsp; ${rows.length} record(s)</td></tr>
  <tr><td colspan="${columns.length}"></td></tr>
  <tr>${headerCells}</tr>
  ${bodyRows}
</table>
</body></html>`;

  triggerDownload(new Blob([html], { type: 'application/vnd.ms-excel' }), `${safeFilename(title)}.xls`);
}

// ── PDF (opens a branded print window → Save as PDF) ──
export function exportToPdf({ title, periodLabel, columns, rows }) {
  const headerCells = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const bodyRows = rows.length
    ? rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(cellValue(row, c))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;padding:24px;color:#64748b;">No records to display.</td></tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 32px; }
  .head { border-bottom: 3px solid #465BA8; padding-bottom: 14px; margin-bottom: 18px; }
  .org { font-size: 13px; font-weight: 800; color: #E31E2F; letter-spacing: .5px; }
  .org span { color: #465BA8; }
  h1 { font-size: 20px; margin: 8px 0 4px; color: #061D3A; }
  .meta { font-size: 12px; color: #475569; }
  .meta strong { color: #465BA8; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
  th { background: #465BA8; color: #fff; text-align: left; padding: 7px 9px; }
  td { border: 1px solid #dbe2f0; padding: 6px 9px; vertical-align: top; }
  tr:nth-child(even) td { background: #f6f8fc; }
  .foot { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 14px; } .noprint { display: none; } }
</style></head>
<body>
  <div class="head">
    <div class="org">PUBLIC UTILITIES <span>REGULATORY COMMISSION</span></div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta"><strong>Selected period:</strong> ${escapeHtml(periodLabel || 'All Records')} &nbsp;&middot;&nbsp; <strong>Generated:</strong> ${escapeHtml(timestamp())} &nbsp;&middot;&nbsp; ${rows.length} record(s)</div>
  </div>
  <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
  <div class="foot">PURC Letter Tracking Suite — Confidential</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups for this site to export the PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
