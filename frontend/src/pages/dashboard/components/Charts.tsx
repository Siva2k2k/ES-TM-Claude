import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EF4444', // red
  '#6366F1', // indigo
  '#EC4899', // pink
  '#F97316', // orange
];

interface ChartData {
  [key: string]: string | number;
}

interface BaseChartProps {
  data: ChartData[];
  height?: number;
  title?: string;
}

/**
 * LineChartCard Component
 * Displays data as a line chart
 */
interface LineChartCardProps extends BaseChartProps {
  dataKeys: { key: string; color?: string; name?: string }[];
}

export const LineChartCard: React.FC<LineChartCardProps> = ({
  data,
  dataKeys,
  height = 300,
  title,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend />
          {dataKeys.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color || COLORS[index % COLORS.length]}
              strokeWidth={2}
              name={item.name || item.key}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * BarChartCard Component
 * Displays data as a bar chart
 */
interface BarChartCardProps extends BaseChartProps {
  dataKeys: { key: string; color?: string; name?: string }[];
  horizontal?: boolean;
}

export const BarChartCard: React.FC<BarChartCardProps> = ({
  data,
  dataKeys,
  height = 300,
  title,
  horizontal = false,
}) => {
  const Chart = BarChart;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          {horizontal ? (
            <>
              <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis type="category" dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend />
          {dataKeys.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              fill={item.color || COLORS[index % COLORS.length]}
              name={item.name || item.key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * PieChartCard Component
 * Displays data as a pie chart
 */
interface PieChartCardProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  showPercentage?: boolean;
}

export const PieChartCard: React.FC<PieChartCardProps> = ({
  data,
  dataKey,
  nameKey,
  height = 300,
  title,
  showPercentage = true,
}) => {
  const renderCustomLabel = (entry: any) => {
    if (!showPercentage) return null;
    return `${entry.percent ? (entry.percent * 100).toFixed(0) : 0}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * AreaChartCard Component
 * Displays data as an area chart
 */
interface AreaChartCardProps extends BaseChartProps {
  dataKeys: { key: string; color?: string; name?: string }[];
  stacked?: boolean;
}

export const AreaChartCard: React.FC<AreaChartCardProps> = ({
  data,
  dataKeys,
  height = 300,
  title,
  stacked = false,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend />
          {dataKeys.map((item, index) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stackId={stacked ? '1' : undefined}
              stroke={item.color || COLORS[index % COLORS.length]}
              fill={item.color || COLORS[index % COLORS.length]}
              fillOpacity={0.6}
              name={item.name || item.key}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * SimpleMetricCard Component
 * Displays a single metric with comparison
 */
interface SimpleMetricCardProps {
  title: string;
  value: string | number;
  comparison?: {
    value: number;
    label: string;
  };
  color?: string;
}

export const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  title,
  value,
  comparison,
  color = '#3B82F6',
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {value}
      </p>
      {comparison && (
        <div className="flex items-center space-x-1">
          <span
            className={`text-sm font-medium ${
              comparison.value >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {comparison.value >= 0 ? '+' : ''}
            {comparison.value}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {comparison.label}
          </span>
        </div>
      )}
    </div>
  );
};
