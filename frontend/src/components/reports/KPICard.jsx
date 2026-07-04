import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

// Canonical stat-card badge colors. `green`/`rose` map to the app's
// consolidated emerald/rose swatches (kept as `green`/`rose` keys so
// existing callers don't need to know the underlying Tailwind family).
const COLOR_CLASSES = {
  blue: { badgeBg: 'bg-blue-50', badgeText: 'text-blue-600' },
  green: { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600' },
  red: { badgeBg: 'bg-red-50', badgeText: 'text-red-600' },
  purple: { badgeBg: 'bg-purple-50', badgeText: 'text-purple-600' },
  amber: { badgeBg: 'bg-amber-50', badgeText: 'text-amber-600' },
  slate: { badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' },
  rose: { badgeBg: 'bg-rose-50', badgeText: 'text-rose-600' },
  teal: { badgeBg: 'bg-teal-50', badgeText: 'text-teal-600' },
  navy: { badgeBg: 'bg-brand-navy-light', badgeText: 'text-brand-navy' },
};

const TREND_CLASSES = {
  up: 'text-emerald-600 bg-emerald-50',
  down: 'text-red-600 bg-red-50',
  neutral: 'text-slate-600 bg-slate-50',
};

const KPICard = ({
  title,
  value,
  trend,
  trendValue,
  icon: Icon = DollarSign,
  color = 'blue',
  format = 'currency',
  footer,
}) => {
  const { badgeBg, badgeText } = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  const formattedValue = format === 'currency' ? formatCurrency(value) : value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        {Icon && (
          <div className={`rounded-lg p-2 ${badgeBg}`}>
            <Icon size={16} className={badgeText} />
          </div>
        )}
      </div>
      <p className="truncate text-2xl font-bold text-slate-900">{formattedValue}</p>
      {trend && (
        <div className={`mt-2 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium ${TREND_CLASSES[trend]}`}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trendValue}%</span>
        </div>
      )}
      {footer}
    </div>
  );
};

export default KPICard;
