import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { http } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ChartExport } from '../components/ui/ChartExport.jsx';

// Bright but lightened palette — vivid without straining
const CHART = {
  blue: '#5C7CFA',
  red: '#FF6B6B',
  teal: '#21C0AE',
  amber: '#FCC419',
  violet: '#9775FA'
};

const priorityColors = {
  Normal: CHART.blue,
  Urgent: CHART.red
};

// Renders percentage labels inside each pie slice (works with fixed-pixel radii)
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, value }) {
  if (!value || value < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.54;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
      {value}%
    </text>
  );
}

export default function Analytics() {
  const { theme } = useAuth();
  const [data, setData] = useState(null);
  const { timeRange, groupBy } = usePersistentPeriod();
  const flowChartRef = useRef(null);
  const deptChartRef = useRef(null);
  const priorityChartRef = useRef(null);

  useEffect(() => {
    http.get('/dashboard/summary', { params: { from: timeRange.from, to: timeRange.to, groupBy } }).then((res) => setData(res.data));
  }, [timeRange, groupBy]);

  if (!data) return null;

  const isDark = theme === 'dark';
  const priority = (data.priorityDistribution?.length ? data.priorityDistribution : [
    { name: 'Normal', value: 0, count: 0 },
    { name: 'Urgent', value: 0, count: 0 }
  ]).map((item) => ({ ...item, color: priorityColors[item.name] || CHART.blue }));

  const departmentColors = [CHART.blue, CHART.red, CHART.teal, CHART.amber, CHART.violet];
  const axisTick = { fill: isDark ? '#CBD5E1' : '#64748B', fontSize: 12, fontWeight: 600 };
  const gridColor = isDark ? '#334155' : '#D7E0EF';
  const panelClass = 'rounded-xl bg-transparent';
  const mutedText = 'text-slate-500 dark:text-slate-300';
  const volumeAxisTick = { ...axisTick, fontSize: groupBy === 'daily' ? 10 : 12 };

  // Department chart dimensions
  // A letter arriving at the commission is addressed to the Executive Secretariat
  // and names no directorate, so received letters cannot honestly be attributed
  // to one. The only directorate actually recorded on a letter is the directorate
  // that INITIATED a dispatched letter — so that is what this chart measures.
  const maxDepartmentWorkload = Math.max(0, ...data.departments.map((d) => d.dispatched));
  const yUpper = Math.max(4, maxDepartmentWorkload + 1);
  const yTicks = Array.from({ length: yUpper + 1 }, (_, i) => i);
  const busiestDepartment = maxDepartmentWorkload > 0
    ? [...data.departments].sort((a, b) => b.dispatched - a.dispatched)[0]
    : null;

  // Trend chart data — use dispatchedExternally from server buckets
  const flowData = data.volume.map((bucket) => ({
    ...bucket,
    dispatchedExternally: bucket.dispatchedExternally ?? 0,
    awaitingDispatch: bucket.awaitingDispatch ?? 0,
    total: (bucket.incoming ?? 0) + (bucket.outgoing ?? 0),
    balance: bucket.incoming - (bucket.dispatchedExternally ?? 0)
  }));
  const incomingTotal = flowData.reduce((sum, b) => sum + b.incoming, 0);
  const dispatchedExternallyTotal = flowData.reduce((sum, b) => sum + (b.dispatchedExternally ?? 0), 0);
  const combinedTotal = incomingTotal + dispatchedExternallyTotal;
  const busiestFlowBucket = [...flowData].sort((a, b) => (b.incoming + b.dispatchedExternally) - (a.incoming + a.dispatchedExternally))[0];

  const maxVolume = Math.max(0, ...flowData.map((b) => Math.max(b.incoming, b.dispatchedExternally)));
  const volumeUpper = maxVolume <= 5 ? Math.max(1, maxVolume) : Math.ceil(maxVolume / 10) * 10;
  const volumeTicks = volumeUpper <= 5 ? Array.from({ length: volumeUpper + 1 }, (_, i) => i) : undefined;
  const volumeXAxisInterval = groupBy === 'daily' ? 0 : 'preserveStartEnd';

  // ── Tooltips ────────────────────────────────────────────────────

  function FlowTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const bucket = payload[0]?.payload;
    const tooltipLabel = bucket?.tooltipLabel || label;
    const received = bucket?.incoming ?? 0;
    const dispatched = bucket?.dispatchedExternally ?? 0;
    const awaiting = bucket?.awaitingDispatch ?? 0;
    return (
      <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <p className="mb-2 font-bold text-ink dark:text-white">{tooltipLabel}</p>
        <p className="font-semibold text-purcBlue dark:text-blue-300">Total Letters Received: {received}</p>
        <p className="mt-1 font-semibold text-purcRed dark:text-red-300">Letters Dispatched: {dispatched}</p>
        {awaiting > 0 && (
          <p className="mt-1 font-semibold text-amber-600 dark:text-amber-300">Dispatched letters at ES: {awaiting}</p>
        )}
      </div>
    );
  }

  function FlowLegend({ payload = [] }) {
    return (
      <div className="mt-3 flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs font-semibold">
        {payload.map((entry) => (
          <span key={entry.value} className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </span>
        ))}
      </div>
    );
  }

  function DepartmentTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const color = departmentColors[data.departments.indexOf(d) % departmentColors.length];
    return (
      <div className="min-w-[260px] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <p className="mb-0.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{d.code}</p>
        <p className="mb-3 text-base font-bold leading-tight text-ink dark:text-white">{d.name}</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
            Dispatched: {d.dispatched}
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">
          Letters dispatched by the Commission that were initiated by {d.name}.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-400">
          Received letters are not counted here — they are addressed to the Executive
          Secretariat and carry no directorate.
        </p>
      </div>
    );
  }

  function PriorityTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl dark:border-white/10 dark:bg-slate-900">
        <p className="font-bold text-ink dark:text-white">{item.name}: {item.value}%</p>
        <p className="mt-1 font-medium text-slate-500 dark:text-slate-300">{item.count} letter record{item.count !== 1 ? 's' : ''}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const periodLabel = formatRangeLabel(timeRange);
  const deptExportColumns = [
    { header: 'Directorate Code', accessor: (d) => d.code },
    { header: 'Directorate', accessor: (d) => d.name },
    { header: 'Letters Dispatched', accessor: (d) => d.dispatched ?? 0 }
  ];
  const flowExportColumns = [
    { header: 'Period', accessor: (b) => b.tooltipLabel || b.month },
    { header: 'Total Letters Received', accessor: (b) => b.incoming },
    { header: 'Letters Dispatched', accessor: (b) => b.dispatchedExternally }
  ];
  const priorityExportColumns = [
    { header: 'Priority', accessor: (p) => p.name },
    { header: 'Percentage', accessor: (p) => `${p.value}%` },
    { header: 'Letter Count', accessor: (p) => p.count }
  ];

  return (
    <div className="space-y-6">
      <PeriodLabel timeRange={timeRange} />

      <div className="space-y-6">

        {/* ── Chart 1: Letters Received vs Dispatched Externally ── */}
        <section className={`${panelClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink dark:text-white">
                <TrendingUp size={18} className="text-purcBlue dark:text-blue-300" />
                Total Letters Received vs Letters Dispatched
              </h2>
              <p className={`mt-1 text-xs font-medium ${mutedText}`}>
                Compares letters received by the Commission against letters confirmed as sent out by ES, grouped by the selected period.
              </p>
            </div>
            <ChartExport
              getNode={() => flowChartRef.current}
              baseName="letters-received-vs-sent"
              excel={{ title: 'Letters Received vs Letters Dispatched', periodLabel, columns: flowExportColumns, rows: flowData }}
            />
          </div>

          {/* 4 summary stats */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Letters Received', value: incomingTotal, accent: CHART.blue, tone: 'text-purcBlue dark:text-blue-200', big: true },
              { label: 'Total Letters Dispatched', value: dispatchedExternallyTotal, accent: CHART.red, tone: 'text-purcRed dark:text-red-200', big: true },
              { label: 'Total Letters', value: combinedTotal, accent: CHART.teal, tone: 'text-teal dark:text-teal-300', big: true },
              { label: 'Busiest Period', value: busiestFlowBucket?.tooltipLabel || '—', accent: '#94A3B8', tone: 'text-slate-700 dark:text-slate-100', big: false }
            ].map((item) => (
              <div key={item.label} className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-slate-900/60">
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: item.accent }} aria-hidden="true" />
                <p className="pl-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                <p className={`mt-1.5 break-words pl-1.5 font-bold leading-snug ${item.big ? 'text-2xl' : 'text-base'} ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div ref={flowChartRef} className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ top: 18, right: 20, left: 0, bottom: 8 }} barGap={10} barCategoryGap={groupBy === 'daily' ? 12 : 28}>
                <CartesianGrid strokeDasharray="4 6" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" interval={volumeXAxisInterval} minTickGap={4} tickLine={false} axisLine={false} tick={volumeAxisTick} angle={groupBy === 'daily' ? -18 : 0} textAnchor={groupBy === 'daily' ? 'end' : 'middle'} height={groupBy === 'daily' ? 48 : 30} />
                <YAxis allowDecimals={false} domain={[0, volumeUpper]} ticks={volumeTicks} width={38} tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip content={<FlowTooltip />} />
                <Legend content={<FlowLegend />} />
                <Bar name="Total Letters Received" dataKey="incoming" fill={CHART.blue} radius={[8, 8, 0, 0]} maxBarSize={42} />
                <Bar name="Letters Dispatched" dataKey="dispatchedExternally" fill={CHART.red} radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Charts 2 & 3 side-by-side, equal height ── */}
        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">

          {/* Directorate Workload */}
          <section className={`${panelClass} flex flex-col p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink dark:text-white">Letters Dispatched by Initiating Directorate</h2>
                <p className={`mt-1 text-xs font-medium ${mutedText}`}>
                  Incoming letters are addressed to the Executive Secretariat and name no
                  directorate, so only dispatched letters carry one. This shows which
                  directorate each dispatched letter came from.
                </p>
              </div>
              <ChartExport
                getNode={() => deptChartRef.current}
                baseName="letters-dispatched-by-directorate"
                excel={{ title: 'Letters Dispatched by Initiating Directorate', periodLabel, columns: deptExportColumns, rows: data.departments }}
              />
            </div>
            <div ref={deptChartRef} className="mt-5 flex-1" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} margin={{ top: 30, right: 12, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="code" tickLine={false} axisLine={false} interval={0} height={38} tick={axisTick} />
                  <YAxis allowDecimals={false} domain={[0, yUpper]} ticks={yTicks} width={32} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<DepartmentTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(70,91,168,0.06)' }} />
                  <Bar dataKey="dispatched" name="Letters Dispatched" radius={[8, 8, 0, 0]} barSize={46}>
                    {data.departments.map((entry, index) => (
                      <Cell key={entry.code} fill={entry.dispatched > 0 ? departmentColors[index % departmentColors.length] : (isDark ? '#334155' : '#E2E8F0')} />
                    ))}
                    <LabelList dataKey="dispatched" position="top" style={{ fill: isDark ? '#CBD5E1' : '#374151', fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {busiestDepartment
                ? <>Most letters dispatched: <span className="font-bold text-ink dark:text-white">{busiestDepartment.name} ({busiestDepartment.dispatched} letters)</span></>
                : 'No letters were dispatched in this period.'}
            </div>
          </section>

          {/* Letter Priority Distribution */}
          <section className={`${panelClass} flex flex-col p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-bold text-ink dark:text-white">Letter Priority Distribution</h2>
              <ChartExport
                getNode={() => priorityChartRef.current}
                baseName="letter-priority-distribution"
                excel={{ title: 'Letter Priority Distribution', periodLabel, columns: priorityExportColumns, rows: priority }}
              />
            </div>
            {/* Chart + legend — side-by-side, chart fills remaining vertical space */}
            <div className="mt-5 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-center">
              {/* Fixed square container guarantees a perfectly circular donut */}
              <div ref={priorityChartRef} className="shrink-0" style={{ width: 240, height: 240 }}>
                <PieChart width={240} height={240}>
                  <Pie
                    data={priority}
                    dataKey="value"
                    nameKey="name"
                    cx={120}
                    cy={120}
                    innerRadius={58}
                    outerRadius={108}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                    labelLine={false}
                    label={PieLabel}
                  >
                    {priority.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PriorityTooltip />} />
                </PieChart>
              </div>
              {/* Legend — vertically centred */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {priority.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-100">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="ml-3 font-bold text-ink dark:text-white">{item.value}%</span>
                  </div>
                ))}
                <p className={`text-center text-[11px] font-medium ${mutedText}`}>
                  {priority.reduce((s, i) => s + i.count, 0)} letter records in the selected period
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
