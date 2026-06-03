import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportData.js';

// Reusable export pair — drop into any page that has tabular data.
// Props: title, periodLabel, columns [{header, accessor}], rows, size ('sm'|'md')
export function ExportButtons({ title, periodLabel, columns, rows = [], size = 'md', className = '' }) {
  const payload = { title, periodLabel, columns, rows };
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  const iconSize = size === 'sm' ? 14 : 15;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => exportToPdf(payload)}
        disabled={!rows.length}
        className={`inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 ${pad}`}
        title="Export the current view as a PDF"
      >
        <FileText size={iconSize} /> Export PDF
      </button>
      <button
        type="button"
        onClick={() => exportToExcel(payload)}
        disabled={!rows.length}
        className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 ${pad}`}
        title="Export the current view as an Excel file"
      >
        <FileSpreadsheet size={iconSize} /> Export Excel
      </button>
    </div>
  );
}
