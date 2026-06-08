import { FileImage, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { exportChartImage } from '../../utils/exportChart.js';
import { exportToExcel } from '../../utils/exportData.js';

// Per-chart export controls: PNG, JPEG, and Excel.
// Props:
//   getNode  -> () => DOM node that contains the chart <svg>
//   baseName -> file name base
//   excel    -> { title, periodLabel, columns, rows } for the Excel export
export function ChartExport({ getNode, baseName, excel }) {
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => exportChartImage(getNode(), baseName, 'png')}
        className={`${btn} border-slate-200 bg-white text-slate-600 hover:border-purcBlue hover:text-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-200`}
        title="Download chart as PNG"
      >
        <ImageIcon size={14} /> PNG
      </button>
      <button
        type="button"
        onClick={() => exportChartImage(getNode(), baseName, 'jpeg')}
        className={`${btn} border-slate-200 bg-white text-slate-600 hover:border-purcBlue hover:text-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-200`}
        title="Download chart as JPEG"
      >
        <FileImage size={14} /> JPEG
      </button>
      <button
        type="button"
        onClick={() => exportToExcel(excel)}
        disabled={!excel?.rows?.length}
        className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300`}
        title="Download chart data as Excel"
      >
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}
