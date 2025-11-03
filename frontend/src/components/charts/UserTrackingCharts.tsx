import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Color palettes
export const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  muted: '#6b7280'
};

export const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
        <p className="text-gray-700 dark:text-gray-300 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Utilization Trend Chart
interface UtilizationTrendProps {
  data: Array<{
    week: string;
    utilization: number;
    billable_hours: number;
    total_hours: number;
  }>;
  height?: number;
}

export const UtilizationTrendChart: React.FC<UtilizationTrendProps> = ({ 
  data, 
  height = 300 
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formattedData = data.map(item => ({
    ...item,
    week: formatDate(item.week),
    utilization: Math.round(item.utilization)
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="week" 
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
        />
        <Tooltip 
          content={<CustomTooltip formatter={(value: number) => `${value}%`} />}
        />
        <Area
          type="monotone"
          dataKey="utilization"
          stroke={COLORS.primary}
          fill={COLORS.primary}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Performance Metrics Bar Chart
interface PerformanceMetricsProps {
  data: {
    utilization: number;
    punctuality: number;
    quality: number;
    consistency: number;
    project_diversity: number;
  };
  height?: number;
}

export const PerformanceMetricsChart: React.FC<PerformanceMetricsProps> = ({ 
  data, 
  height = 250 
}) => {
  const chartData = [
    { name: 'Utilization', value: data.utilization, color: COLORS.primary },
    { name: 'Punctuality', value: data.punctuality, color: COLORS.warning },
    { name: 'Quality', value: data.quality, color: COLORS.success },
    { name: 'Consistency', value: data.consistency, color: COLORS.info },
    { name: 'Diversity', value: data.project_diversity, color: COLORS.secondary }
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          type="number" 
          domain={[0, 100]}
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          type="category" 
          dataKey="name"
          className="text-xs"
          tick={{ fontSize: 12 }}
          width={80}
        />
        <Tooltip 
          content={<CustomTooltip formatter={(value: number) => `${value}%`} />}
        />
        <Bar dataKey="value" fill={COLORS.primary}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Project Hours Pie Chart
interface ProjectHoursProps {
  data: Array<{
    project_name: string;
    total_hours: number;
    billable_hours: number;
    is_training: boolean;
  }>;
  height?: number;
}

export const ProjectHoursChart: React.FC<ProjectHoursProps> = ({ 
  data, 
  height = 250 
}) => {
  const chartData = data.map((project, index) => ({
    name: project.project_name,
    value: project.total_hours,
    billable: project.billable_hours,
    color: PIE_COLORS[index % PIE_COLORS.length],
    isTraining: project.is_training
  }));

  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, p) => sum + p.total_hours, 0)) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip formatter={(value: number) => `${value}h`} />}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Team Performance Comparison Chart
interface TeamPerformanceProps {
  data: Array<{
    full_name: string;
    avg_utilization: number;
    avg_punctuality: number;
    avg_quality: number;
    overall_score: number;
  }>;
  height?: number;
}

export const TeamPerformanceChart: React.FC<TeamPerformanceProps> = ({ 
  data, 
  height = 300 
}) => {
  const chartData = data.slice(0, 8).map(item => ({
    name: item.full_name.split(' ')[0], // Use first name for brevity
    utilization: Math.round(item.avg_utilization),
    punctuality: Math.round(item.avg_punctuality),
    quality: Math.round(item.avg_quality),
    overall: Math.round(item.overall_score)
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="name" 
          className="text-xs"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          className="text-xs"
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
        />
        <Tooltip 
          content={<CustomTooltip formatter={(value: number) => `${value}%`} />}
        />
        <Bar dataKey="utilization" fill={COLORS.primary} name="Utilization" />
        <Bar dataKey="punctuality" fill={COLORS.warning} name="Punctuality" />
        <Bar dataKey="quality" fill={COLORS.success} name="Quality" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Weekly Trends Line Chart
interface WeeklyTrendsProps {
  data: Array<{
    _id: string;
    avg_utilization: number;
    avg_punctuality: number;
    avg_quality: number;
    total_hours: number;
    user_count: number;
  }>;
  height?: number;
}

export const WeeklyTrendsChart: React.FC<WeeklyTrendsProps> = ({ 
  data, 
  height = 300 
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map(item => ({
    week: formatDate(item._id),
    utilization: Math.round(item.avg_utilization),
    punctuality: Math.round(item.avg_punctuality),
    quality: Math.round(item.avg_quality),
    hours: Math.round(item.total_hours),
    users: item.user_count
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="week" 
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
        />
        <Tooltip 
          content={<CustomTooltip formatter={(value: number) => `${value}%`} />}
        />
        <Line
          type="monotone"
          dataKey="utilization"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Utilization"
        />
        <Line
          type="monotone"
          dataKey="punctuality"
          stroke={COLORS.warning}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Punctuality"
        />
        <Line
          type="monotone"
          dataKey="quality"
          stroke={COLORS.success}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Quality"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Simple Metric Card with Mini Chart
interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  trend?: Array<{ value: number }>;
  color?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  suffix = '',
  trend = [],
  color = COLORS.primary,
  icon
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
              <div style={{ color }}>{icon}</div>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}{suffix}
            </p>
          </div>
        </div>
      </div>
      
      {trend.length > 0 && (
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};