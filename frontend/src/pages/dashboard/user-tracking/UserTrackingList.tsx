import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Users,
  BarChart3,
  Clock,
  Award,
  ChevronLeft,
  ArrowUpDown
} from 'lucide-react';
import { userTrackingService, UserListItem } from '../../../services/UserTrackingService';
import { useAuth } from '../../../store/contexts/AuthContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { cn } from '../../../utils/cn';

interface SortConfig {
  key: keyof UserListItem | null;
  direction: 'asc' | 'desc';
}

const UserTrackingList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading users with filters:', { weeks: selectedWeeks, page: pagination.page, limit: pagination.limit, search: searchTerm });
      const response = await userTrackingService.getUserList({
        weeks: selectedWeeks,
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined
      });
      
      console.log('Users API response:', response);
      
      if (response && response.users) {
        setUsers(response.users);
        setPagination(response.pagination);
      } else {
        console.warn('No user data received from API');
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(`Failed to load user data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedWeeks, pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    // Check permissions and log current user info for debugging
    console.log('Current user role for UserTrackingList:', currentUserRole);
    
    if (!['manager', 'management', 'super_admin'].includes(currentUserRole || '')) {
      console.log('Access denied to UserTrackingList. Role required: manager, management, or super_admin. Current role:', currentUserRole);
      navigate('/dashboard');
      return;
    }

    console.log('Permission granted to UserTrackingList. Loading users...');
    loadUsers();
  }, [currentUserRole, navigate, loadUsers]);

  const handleSort = (key: keyof UserListItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedUsers = [...users].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      // Handle undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? 1 : -1;
      if (bValue == null) return direction === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setUsers(sortedUsers);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const renderSortIcon = (key: keyof UserListItem) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return (
      <ArrowUpDown 
        className={cn(
          'w-4 h-4',
          sortConfig.direction === 'desc' ? 'rotate-180' : '',
          'text-blue-600 dark:text-blue-400'
        )} 
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/user-tracking')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Performance Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor individual user performance and productivity metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              try {
                console.log('Testing Users API connectivity...');
                const testResponse = await fetch('/api/v1/user-tracking/users?weeks=4&page=1&limit=20', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Test response status:', testResponse.status);
                const testData = await testResponse.json();
                console.log('Test response data:', testData);
                alert(`Users API Test: ${testResponse.status} - ${JSON.stringify(testData, null, 2)}`);
              } catch (error) {
                console.error('Users API test failed:', error);
                alert(`Users API Test Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Test API
          </button>

          <button
            onClick={async () => {
              try {
                console.log('Triggering aggregation for users...');
                const aggResponse = await fetch('/api/v1/user-tracking/aggregate', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ weeks: 8 })
                });
                console.log('Aggregation response status:', aggResponse.status);
                const aggData = await aggResponse.json();
                console.log('Aggregation response data:', aggData);
                alert(`Aggregation: ${aggResponse.status} - Processed: ${aggData.data?.processed || 0} records`);
                
                // Reload data after aggregation
                if (aggResponse.ok) {
                  loadUsers();
                }
              } catch (error) {
                console.error('Aggregation failed:', error);
                alert(`Aggregation Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Trigger Aggregation
          </button>

          <button
            onClick={async () => {
              try {
                console.log('Checking aggregation stats...');
                const statsResponse = await fetch('/api/v1/user-tracking/stats?weeks=4', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Stats response status:', statsResponse.status);
                const statsData = await statsResponse.json();
                console.log('Stats response data:', statsData);
                alert(`Stats: ${statsResponse.status} - ${JSON.stringify(statsData, null, 2)}`);
              } catch (error) {
                console.error('Stats check failed:', error);
                alert(`Stats Check Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Check Stats
          </button>
          
          <select
            value={selectedWeeks}
            onChange={(e) => setSelectedWeeks(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={2}>Last 2 weeks</option>
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
          </select>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('full_name')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    User
                    {renderSortIcon('full_name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('avg_utilization')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Utilization
                    {renderSortIcon('avg_utilization')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('avg_punctuality')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Punctuality
                    {renderSortIcon('avg_punctuality')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('avg_quality')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Quality
                    {renderSortIcon('avg_quality')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('total_hours')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Total Hours
                    {renderSortIcon('total_hours')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Weeks Tracked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {user.full_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.avg_utilization}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar 
                        value={user.avg_utilization} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.avg_punctuality}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar 
                        value={user.avg_punctuality} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.avg_quality}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar 
                        value={user.avg_quality} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {user.total_hours}h
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-600 dark:text-gray-400">
                      {user.weeks_tracked}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => navigate(`/dashboard/user-tracking/users/${user.id}/analytics`)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? 'No users found matching your search.' : 'No user data available.'}
              </p>
              {!searchTerm && (
                <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
                  <p>This might be because:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>No UserWeekSummary data has been aggregated yet</li>
                    <li>No users have submitted timesheets in the selected time period</li>
                    <li>You don't have access to view user data</li>
                  </ul>
                  <p className="mt-4">
                    Try clicking "Trigger Aggregation" above to process existing timesheet data.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + Math.max(1, pagination.page - 2);
                  if (page > pagination.pages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination(prev => ({ ...prev, page }))}
                      className={cn(
                        'px-3 py-1 text-sm border rounded-lg',
                        page === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadUsers}
            className="mt-2 text-red-700 dark:text-red-300 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default UserTrackingList;