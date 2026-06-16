import { Router } from 'express';
import { departments, letters, notifications } from '../../utils/sampleData.js';
import { enrichLettersWithRemarkIntelligence, remarkInsights } from '../../utils/remarkIntelligence.js';

export const dashboardRouter = Router();

function getLetterDate(letter) {
  return new Date(letter.receivedAt || letter.dispatchedAt || letter.createdAt || Date.now());
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function parseDate(value, fallback, boundary = 'start') {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return boundary === 'end' ? endOfDay(parsed) : startOfDay(parsed);
  }
  return parsed;
}

function defaultGroupForPeriod(period) {
  if (period === 'week') return 'daily';
  if (period === 'quarter' || period === 'year') return 'monthly';
  if (period === 'all') return 'yearly';
  return 'weekly';
}

function normalizeGroup(value, fallback) {
  return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(value) ? value : fallback;
}

function getFallbackRange(items, period = 'month') {
  const now = new Date();
  const to = endOfDay(now);

  if (period === 'week') {
    const from = startOfDay(now);
    from.setDate(now.getDate() - 6);
    return { from, to };
  }
  if (period === 'quarter') {
    return { from: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), to };
  }
  if (period === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to };
  }
  if (period === 'all') {
    const dates = items.map((letter) => getLetterDate(letter)).filter((date) => !Number.isNaN(date.getTime()));
    return {
      from: dates.length ? startOfDay(new Date(Math.min(...dates.map((date) => date.getTime())))) : new Date(now.getFullYear(), 0, 1),
      to
    };
  }

  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
}

function resolveRange(query, items) {
  const period = query.period || 'month';
  const fallback = getFallbackRange(items, period);
  let from = parseDate(query.from, fallback.from, 'start');
  let to = parseDate(query.to, fallback.to, 'end');
  if (from.getTime() > to.getTime()) {
    [from, to] = [to, from];
  }
  return {
    from,
    to,
    groupBy: normalizeGroup(query.groupBy, defaultGroupForPeriod(period)),
    period
  };
}

function filterByRange(items, range) {
  return items.filter((letter) => {
    const date = getLetterDate(letter);
    return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
  });
}

function previousEquivalentRange(range) {
  const duration = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - duration);
  return { ...range, from, to };
}

function trend(current, previous) {
  if (previous === 0 && current === 0) return '0%';
  if (previous === 0) return '+100%';
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function normalizeDepartment(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesDepartment(value, department) {
  const normalized = normalizeDepartment(value);
  if (!normalized) return false;
  return normalized === normalizeDepartment(department.name) || normalized === normalizeDepartment(department.code);
}

function isExecutiveSecretary(department) {
  return matchesDepartment('Executive Secretary', department) || matchesDepartment('ES', department);
}

function isEsOffice(value) {
  return ['es office', 'executive secretary', 'executive secretary office'].includes(normalizeDepartment(value));
}

function isReceived(letter) {
  return letter.status === 'RECEIVED' || letter.type === 'INCOMING';
}

function isDispatched(letter) {
  return letter.status === 'DISPATCHED' || letter.type === 'OUTGOING';
}

function outgoingFromDepartment(letter, department) {
  if (letter.type !== 'OUTGOING') return false;
  return matchesDepartment(letter.routeDepartment, department)
    || matchesDepartment(letter.sender, department);
}

function incomingDispatchedToDepartment(letter, department) {
  if (letter.type !== 'INCOMING') return false;
  return matchesDepartment(letter.routeDepartment, department)
    || matchesDepartment(letter.currentDepartment, department);
}

function uniqueLetters(items) {
  const map = new Map();
  items.forEach((letter) => map.set(letter.id, letter));
  return Array.from(map.values());
}

function sourceBreakdown(items) {
  const sources = new Map();
  items.forEach((letter) => {
    const source = letter.type === 'INCOMING' ? (letter.senderOrganization || letter.sender) : letter.recipient;
    const current = sources.get(source) || { name: source, incoming: 0, outgoing: 0, total: 0 };
    if (letter.type === 'INCOMING') current.incoming += 1;
    if (letter.type === 'OUTGOING') current.outgoing += 1;
    current.total += 1;
    sources.set(source, current);
  });
  return Array.from(sources.values()).sort((a, b) => b.total - a.total);
}

function bucketStart(date, groupBy) {
  const copy = startOfDay(date);
  if (groupBy === 'weekly') {
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
  }
  if (groupBy === 'monthly') {
    copy.setDate(1);
  }
  if (groupBy === 'quarterly') {
    copy.setMonth(Math.floor(copy.getMonth() / 3) * 3, 1);
  }
  if (groupBy === 'yearly') {
    copy.setMonth(0, 1);
  }
  return copy;
}

function addBucket(date, groupBy) {
  const copy = new Date(date);
  if (groupBy === 'daily') copy.setDate(copy.getDate() + 1);
  if (groupBy === 'weekly') copy.setDate(copy.getDate() + 7);
  if (groupBy === 'monthly') copy.setMonth(copy.getMonth() + 1);
  if (groupBy === 'quarterly') copy.setMonth(copy.getMonth() + 3);
  if (groupBy === 'yearly') copy.setFullYear(copy.getFullYear() + 1);
  return copy;
}

function bucketId(date) {
  return date.toISOString().slice(0, 10);
}

function formatBucketLabel(date, groupBy) {
  if (groupBy === 'daily') return `${date.toLocaleString('en', { weekday: 'short' })} ${date.getDate()}`;
  if (groupBy === 'weekly') return date.toLocaleString('en', { month: 'short', day: 'numeric' });
  if (groupBy === 'monthly') return date.toLocaleString('en', { month: 'short' });
  if (groupBy === 'quarterly') return `Q${Math.floor(date.getMonth() / 3) + 1}`;
  return String(date.getFullYear());
}

function formatBucketTooltip(date, groupBy) {
  if (groupBy === 'daily') return date.toLocaleString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (groupBy === 'weekly') return `Week of ${date.toLocaleString('en', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  if (groupBy === 'monthly') return date.toLocaleString('en', { month: 'long', year: 'numeric' });
  if (groupBy === 'quarterly') return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  return String(date.getFullYear());
}

function getVolumeBuckets(items, range) {
  const buckets = new Map();
  // Don't draw empty leading periods before any data exists (e.g. the
  // "All Records" range starts in 2020, but the first letter may be in 2026).
  // Start the chart at the earliest actual letter date within the range.
  const datesInRange = filterByRange(items, range)
    .map((letter) => getLetterDate(letter).getTime())
    .filter((time) => !Number.isNaN(time));
  const earliest = datesInRange.length ? new Date(Math.min(...datesInRange)) : range.from;
  const effectiveFrom = earliest.getTime() > range.from.getTime() ? earliest : range.from;

  let cursor = bucketStart(effectiveFrom, range.groupBy);
  const last = bucketStart(range.to, range.groupBy);

  while (cursor.getTime() <= last.getTime()) {
    const start = new Date(cursor);
    buckets.set(bucketId(start), {
      month: formatBucketLabel(start, range.groupBy),
      tooltipLabel: formatBucketTooltip(start, range.groupBy),
      incoming: 0,
      outgoing: 0,
      dispatchedExternally: 0,
      awaitingDispatch: 0
    });
    cursor = addBucket(cursor, range.groupBy);
  }

  filterByRange(items, range).forEach((letter) => {
    const key = bucketId(bucketStart(getLetterDate(letter), range.groupBy));
    const bucket = buckets.get(key);
    if (!bucket) return;
    if (letter.type === 'INCOMING') bucket.incoming += 1;
    if (letter.type === 'OUTGOING') {
      bucket.outgoing += 1;
      bucket.dispatchedExternally += 1; // every outgoing letter is dispatched
    }
  });

  return Array.from(buckets.values());
}

// Only two priorities are supported: Urgent and Normal.
function normalizePriority(value) {
  return ['URGENT', 'HIGH'].includes(String(value || '').toUpperCase()) ? 'URGENT' : 'NORMAL';
}

function priorityDistribution(items) {
  const priorities = [
    { key: 'NORMAL', name: 'Normal' },
    { key: 'URGENT', name: 'Urgent' }
  ];
  const total = items.length;
  return priorities.map((priority) => {
    const count = items.filter((letter) => normalizePriority(letter.priority) === priority.key).length;
    return {
      name: priority.name,
      key: priority.key,
      count,
      value: total ? Math.round((count / total) * 100) : 0
    };
  });
}

function attachmentInsights(items) {
  const withAttachments = items.filter((letter) => Number(letter.attachments) > 0).length;
  return {
    withAttachments,
    withoutAttachments: items.length - withAttachments
  };
}

dashboardRouter.get('/summary', (req, res) => {
  // Use actual stored statuses — never let inference override what the user explicitly set.
  // Intelligence enrichment is only added for remark-insight metadata, not for counting.
  const range = resolveRange(req.query, letters);
  const periodLetters = filterByRange(letters, range);
  const previousLetters = filterByRange(letters, previousEquivalentRange(range));

  // Charts / analytics use period-filtered actual letters
  const incoming = periodLetters.filter((letter) => letter.type === 'INCOMING');
  const outgoing = periodLetters.filter((letter) => letter.type === 'OUTGOING');
  const previousIncoming = previousLetters.filter((letter) => letter.type === 'INCOMING');

  // Metric CARDS use ALL-TIME counts. Two statuses only: every incoming letter
  // is RECEIVED, every outgoing letter is DISPATCHED — so counting by type is exact.
  const allReceived = letters.filter((l) => l.type === 'INCOMING');
  const allDispatched = letters.filter((l) => l.type === 'OUTGOING');

  const registerLetters = [...periodLetters]
    .sort((a, b) => getLetterDate(b).getTime() - getLetterDate(a).getTime());
  const recentLetters = registerLetters.slice(0, 5);

  // Enrich only for remark metadata (does NOT affect actual status counts above)
  const enrichedPeriod = enrichLettersWithRemarkIntelligence(periodLetters);

  res.json({
    metrics: [
      { label: 'Total Letters Received', value: allReceived.length, trend: '0%', tone: 'blue' },
      { label: 'Total Letters Dispatched', value: allDispatched.length, trend: '0%', tone: 'red' }
    ],
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      groupBy: range.groupBy
    },
    volume: getVolumeBuckets(letters, range),
    priorityDistribution: priorityDistribution(periodLetters),
    attachmentInsights: attachmentInsights(periodLetters),
    remarkInsights: remarkInsights(enrichedPeriod),
    departments: departments.map((department) => {
      const sentLetters = periodLetters.filter((letter) => outgoingFromDepartment(letter, department));
      const receivedLetters = periodLetters.filter((letter) => incomingDispatchedToDepartment(letter, department));
      const dedicatedLetters = uniqueLetters([...sentLetters, ...receivedLetters]);
      return {
        code: department.code,
        name: department.name,
        workload: dedicatedLetters.length,
        sent: sentLetters.length,
        dispatched: sentLetters.length,
        received: receivedLetters.length,
        total: dedicatedLetters.length,
        sources: sourceBreakdown(dedicatedLetters)
      };
    }),
    registerLetters,
    recentLetters,
    notifications: notifications.slice(0, 4)
  });
});
