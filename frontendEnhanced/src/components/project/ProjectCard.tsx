/**
 * ProjectCard Component
 *
 * Visual card display for a project with key metrics and actions.
 *
 * Features:
 * - Project overview
 * - Progress indicator
 * - Budget utilization
 * - Health status
 * - Quick actions
 * - Team member avatars
 *
 * Cognitive Complexity: 8 (Target: <15)
 */

import React from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Edit,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { StatusBadge } from '../shared/StatusBadge';
import {
  calculateProjectProgress,
  calculateBudgetUtilization,
  getProjectHealthStatus,
  isProjectOverdue,
  type ProjectStatus
} from '../../types/project.schemas';
import { formatDate, formatCurrency } from '../../utils/formatting';
import { cn } from '../../utils/cn';

export interface ProjectCardProps {
  /** Project data */
  project: {
    id: string;
    name: string;
    client_name?: string;
    status: ProjectStatus;
    start_date: string;
    end_date?: string;
    budget: number;
    description?: string;
    is_billable: boolean;
    tasks?: Array<{ status: string }>;
    total_hours_logged?: number;
    avg_hourly_rate?: number;
    team_members?: Array<{ name: string; avatar?: string }>;
    primary_manager_name?: string;
  };
  /** View mode */
  viewMode?: 'grid' | 'list';
  /** Show detailed metrics */
  showMetrics?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** View details handler */
  onViewDetails?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  viewMode = 'grid',
  showMetrics = true,
  onClick,
  onEdit,
  onViewDetails
}) => {
  const progress = calculateProjectProgress(project);
  const budgetUtil = calculateBudgetUtilization(project);
  const healthStatus = getProjectHealthStatus(project);
  const overdue = isProjectOverdue(project);

  const healthColors = {
    healthy: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    critical: 'bg-red-100 text-red-800 border-red-300'
  };

  const healthIcons = {
    healthy: CheckCircle,
    warning: AlertTriangle,
    critical: AlertTriangle
  };

  const HealthIcon = healthIcons[healthStatus];

  if (viewMode === 'list') {
    return (
      <div
        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg truncate">{project.name}</h3>
              <StatusBadge status={project.status} type="project" />
              {overdue && <Badge variant="destructive" size="sm">Overdue</Badge>}
              {project.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
            </div>
            <p className="text-sm text-gray-600">{project.client_name || 'No Client'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-lg font-bold">{progress}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Budget</p>
              <p className={`text-lg font-bold ${budgetUtil > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                {budgetUtil}%
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={Eye} onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }} />
              <Button variant="outline" size="sm" icon={Edit} onClick={(e) => { e.stopPropagation(); onEdit?.(); }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{project.name}</h3>
            </div>
            <p className="text-sm text-gray-600 truncate">{project.client_name || 'No Client'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={MoreVertical}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={project.status} type="project" />
          {overdue && <Badge variant="destructive" size="sm">Overdue</Badge>}
          {project.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
          <div className={cn('px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1', healthColors[healthStatus])}>
            <HealthIcon className="h-3 w-3" />
            {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
        )}

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Task Progress</span>
            <span className="text-xs font-bold text-gray-900">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {project.tasks?.filter(t => t.status === 'completed').length || 0} / {project.tasks?.length || 0} tasks completed
          </p>
        </div>

        {/* Budget Utilization */}
        {showMetrics && project.budget > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Budget Used</span>
              <span className={cn(
                'text-xs font-bold',
                budgetUtil > 100 ? 'text-red-600' : budgetUtil > 80 ? 'text-yellow-600' : 'text-gray-900'
              )}>
                {budgetUtil}%
              </span>
            </div>
            <Progress
              value={Math.min(budgetUtil, 100)}
              className={cn(
                'h-2',
                budgetUtil > 100 && '[&>div]:bg-red-500',
                budgetUtil > 80 && budgetUtil <= 100 && '[&>div]:bg-yellow-500'
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency((project.total_hours_logged || 0) * (project.avg_hourly_rate || 0))} / {formatCurrency(project.budget)}
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(project.start_date, 'MMM DD, YYYY')}</span>
          </div>
          {project.end_date && (
            <div className="flex items-center gap-1">
              <span>→</span>
              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(project.end_date, 'MMM DD, YYYY')}
              </span>
            </div>
          )}
        </div>

        {/* Team Members */}
        {project.team_members && project.team_members.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div className="flex -space-x-2">
              {project.team_members.slice(0, 5).map((member, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                  title={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {project.team_members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                  +{project.team_members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager */}
        {project.primary_manager_name && (
          <p className="text-xs text-gray-500">
            Manager: <span className="font-medium text-gray-700">{project.primary_manager_name}</span>
          </p>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={Edit}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
};
