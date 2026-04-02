import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const KPICard = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon: Icon = DollarSign,
  color = 'blue',
  format = 'currency'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  const formattedValue = format === 'currency' ? formatCurrency(value) : value;

  return (
    <div className={`p-6 border-2 rounded-lg ${colorClasses[color]}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColors[trend]}`}>
              {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-50`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
