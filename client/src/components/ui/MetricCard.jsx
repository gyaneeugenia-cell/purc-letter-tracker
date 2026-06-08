import { motion } from 'framer-motion';

export function MetricCard({ icon: Icon, label, description, value, tone = 'blue', onClick, compact = false }) {
  // Soft, pastel styling: thin coloured top bar, pale-tinted icon chip with a
  // coloured outline icon, dark label/number, and a faint wave at the bottom.
  const tones = {
    blue: {
      bar: 'from-indigo-400 to-blue-500',
      iconBg: 'bg-indigo-50 dark:bg-indigo-500/15',
      iconText: 'text-indigo-500 dark:text-indigo-300',
      wave: 'fill-indigo-100/70 dark:fill-indigo-500/10'
    },
    sky: {
      bar: 'from-sky-400 to-cyan-500',
      iconBg: 'bg-sky-50 dark:bg-sky-500/15',
      iconText: 'text-sky-500 dark:text-sky-300',
      wave: 'fill-sky-100/70 dark:fill-sky-500/10'
    },
    amber: {
      bar: 'from-amber-300 to-orange-400',
      iconBg: 'bg-amber-50 dark:bg-amber-500/15',
      iconText: 'text-amber-500 dark:text-amber-300',
      wave: 'fill-amber-100/70 dark:fill-amber-500/10'
    },
    teal: {
      bar: 'from-emerald-400 to-green-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      iconText: 'text-emerald-500 dark:text-emerald-300',
      wave: 'fill-emerald-100/70 dark:fill-emerald-500/10'
    },
    violet: {
      bar: 'from-violet-400 to-purple-500',
      iconBg: 'bg-violet-50 dark:bg-violet-500/15',
      iconText: 'text-violet-500 dark:text-violet-300',
      wave: 'fill-violet-100/70 dark:fill-violet-500/10'
    },
    red: {
      bar: 'from-rose-400 to-red-500',
      iconBg: 'bg-rose-50 dark:bg-rose-500/15',
      iconText: 'text-rose-500 dark:text-rose-300',
      wave: 'fill-rose-100/70 dark:fill-rose-500/10'
    }
  };
  const style = tones[tone] || tones.blue;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      className={`relative flex min-h-[150px] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${compact ? 'p-4' : 'p-5'} shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_rgba(15,35,74,0.05)] dark:border-white/10 dark:bg-slate-900/70 ${onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,35,74,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-500/10' : ''}`}
    >
      {/* thin coloured top bar */}
      <div className={`absolute inset-x-4 top-0 h-1 rounded-b-full bg-gradient-to-r ${style.bar}`} />

      {/* faint bottom wave */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,22 C80,4 150,34 220,20 C290,6 350,26 400,16 L400,40 L0,40 Z" className={style.wave} />
      </svg>

      {/* label row + icon */}
      <div className="relative flex items-start justify-between gap-3">
        <p className={`min-w-0 ${compact ? 'text-[13px] leading-5' : 'text-[15px] leading-6'} font-semibold text-slate-500 dark:text-slate-300`}>{label}</p>
        {Icon && (
          <div className={`grid ${compact ? 'h-11 w-11' : 'h-14 w-14'} shrink-0 place-items-center rounded-2xl ${style.iconBg} ${style.iconText}`}>
            <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={2} />
          </div>
        )}
      </div>

      {/* number pinned to the bottom so every card's number aligns */}
      <p className={`relative mt-auto pt-3 ${compact ? 'text-[34px]' : 'text-4xl'} font-black leading-none tracking-[-0.03em] text-[#0b2348] dark:text-white`}>{value}</p>
      {!compact && description && <p className="relative mt-2 max-w-[15rem] text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">{description}</p>}
    </motion.div>
  );
}
