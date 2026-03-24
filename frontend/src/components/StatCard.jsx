import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardContent } from './ui/Card';

const StatCard = React.forwardRef(
  (
    {
      title,
      value,
      icon: Icon,
      trend,
      trendValue,
      loading = false,
      className,
      ...props
    },
    ref
  ) => {
    const isPositive = trend === 'up';

    return (
      <Card
        ref={ref}
        className={cn('hover:shadow-lg transition-shadow', className)}
        {...props}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-neutral-600">{title}</p>
              {loading ? (
                <div className="h-8 w-24 bg-neutral-200 rounded animate-skeleton-loading" />
              ) : (
                <p className="text-3xl font-bold text-neutral-900">{value}</p>
              )}
              {trendValue && (
                <div className="flex items-center gap-1 pt-2">
                  {isPositive ? (
                    <TrendingUp size={16} className="text-green-600" />
                  ) : (
                    <TrendingDown size={16} className="text-red-600" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositive ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
            {Icon && (
              <div className="w-12 h-12 rounded-lg bg-mahogany-50 flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-mahogany-700" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

export default StatCard;
