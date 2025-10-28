import React from 'react';
import { Plus, FolderKanban, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../store/contexts/AuthContext';

interface ProjectHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectCount: number;
}

/**
 * ProjectHeader Component
 * Page header with title, navigation tabs, and action button
 *
 * Features:
 * - Gradient title
 * - Tab navigation (Overview, Create, Members, Analytics)
 * - Conditional "New Project" button
 * - Project count in overview tab
 */
export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  activeTab,
  onTabChange,
  projectCount,
}) => {
  const { currentUser } = useAuth();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Project Management
          </h1>
          <p className="text-gray-600">Create and manage all projects across the organization</p>
        </div>
        {activeTab === 'overview' && currentUser?.role !== 'manager' && (
          <button
            onClick={() => onTabChange('create')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-2">
        <nav className="flex flex-wrap gap-2">
          <button
            onClick={() => onTabChange('overview')}
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <span>Projects ({projectCount})</span>
            </div>
          </button>

          {currentUser?.role !== 'manager' && (
          <button
            onClick={() => onTabChange('create')}
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </div>
          </button>)}

          <button
            onClick={() => onTabChange('members')}
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </div>
          </button>

          {currentUser?.role !== 'manager' && (
          <button
            onClick={() => onTabChange('analytics')}
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </div>
          </button>)}
        </nav>
      </div>
    </div>
  );
};
