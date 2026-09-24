// Compliance is derived from the dates so it is always current, even without a
// fresh fetch. Only dispatched letters that carry a deadline are tracked.
//
//   COMPLIANT  – the utility was marked as having complied (met the deadline)
//   OVERDUE    – the deadline day has passed and no compliance was recorded
//   DUE_SOON   – deadline is within the next 3 days and not yet complied
//   PENDING    – deadline is set and still comfortably in the future
//   null       – no deadline, nothing to track

const DAY = 24 * 60 * 60 * 1000;

function endOfDeadlineDay(deadlineAt) {
  const end = new Date(deadlineAt);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function getCompliance(letter) {
  if (!letter || letter.type !== 'OUTGOING' || !letter.deadlineAt) return null;

  const end = endOfDeadlineDay(letter.deadlineAt);
  const daysLeft = Math.ceil((end - Date.now()) / DAY);

  if (letter.compliedAt) {
    // A response was captured — compliant if it arrived by the deadline, else late.
    const onTime = new Date(letter.compliedAt).getTime() <= end;
    return onTime
      ? { status: 'COMPLIANT', label: 'Compliant', tone: 'emerald', daysLeft, respondedAt: letter.compliedAt }
      : { status: 'COMPLIED_LATE', label: 'Non-compliant', tone: 'red', daysLeft, respondedAt: letter.compliedAt };
  }
  if (Date.now() > end) {
    const overdueBy = Math.abs(daysLeft);
    return { status: 'OVERDUE', label: 'Non-compliant', tone: 'red', daysLeft, overdueBy };
  }
  if (daysLeft <= 3) {
    return { status: 'DUE_SOON', label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, tone: 'amber', daysLeft };
  }
  return { status: 'PENDING', label: `Due in ${daysLeft} days`, tone: 'slate', daysLeft };
}

const toneClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  red: 'bg-red-50 text-purcRed dark:bg-red-900/40 dark:text-red-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  slate: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200'
};

export function complianceChipClass(tone) {
  return toneClasses[tone] || toneClasses.slate;
}

export function formatDeadline(deadlineAt) {
  if (!deadlineAt) return '—';
  return new Date(deadlineAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
