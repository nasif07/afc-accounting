import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { CardSkeleton } from './ui/Skeleton';
import { formatCurrency } from '../utils/currency';

const RevenueChart = React.forwardRef(
  ({ data = [], loading = false, title = 'Revenue Trend', ...props }, ref) => {
    if (loading) {
      return <CardSkeleton />;
    }

    if (!data || data.length === 0) {
      return (
        <Card ref={ref} {...props}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-neutral-500">
              No data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref} {...props}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `৳${(value / 100000).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                }}
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: '#1F2937' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="receipts"
                stroke="#1A0D08"
                strokeWidth={2}
                dot={{ fill: '#1A0D08', r: 4 }}
                activeDot={{ r: 6 }}
                name="Receipts"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }
);

RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;
