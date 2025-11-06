import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Award,
  BarChart3,
  Clock,
  Star,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { userTrackingService, TeamRankingItem } from '../../../services/UserTrackingService';
import { useAuth } from '../../../store/contexts/AuthContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { cn } from '../../../utils/cn';

interface SortConfig {
  key: keyof TeamRankingItem | null;
  direction: 'asc' | 'desc';
}

const TeamRankingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [rankings, setRankings] = useState<TeamRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(8);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'overall_score', direction: 'desc' });

  const loadRankings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading team rankings with weeks:', selectedWeeks);
      const response = await userTrackingService.getTeamRanking({ weeks: selectedWeeks });
      
      console.log('Team rankings response:', response);
      
      if (response && Array.isArray(response)) {
        setRankings(response);
      } else {
        console.warn('No ranking data received from API');
        setRankings([]);
      }
    } catch (err) {
      console.error('Failed to load team rankings:', err);
      setError(`Failed to load team rankings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedWeeks]);

  useEffect(() => {
    // Check permissions
    console.log('Current user role for TeamRanking:', currentUserRole);
    
    if (!['manager', 'management', 'super_admin'].includes(currentUserRole || '')) {
      console.log('Access denied to TeamRanking. Role required: manager, management, or super_admin');
      navigate('/dashboard');
      return;
    }

    console.log('Permission granted to TeamRanking. Loading rankings...');
    loadRankings();
  }, [currentUserRole, navigate, loadRankings]);

  const handleSort = (key: keyof TeamRankingItem) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedRankings = [...rankings].sort((a, b) => {
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
    
    setRankings(sortedRankings);
  };

  const renderSortIcon = (key: keyof TeamRankingItem) => {
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
            {rank}
          </div>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Team Performance Ranking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Leaderboard showing top performers based on overall performance score
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              try {
                console.log('Testing Team Ranking API connectivity...');
                const testResponse = await fetch('/api/v1/user-tracking/team/ranking?weeks=4', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Test response status:', testResponse.status);
                const testData = await testResponse.json();
                console.log('Test response data:', testData);
                alert(`Team Ranking API Test: ${testResponse.status} - ${JSON.stringify(testData, null, 2)}`);
              } catch (error) {
                console.error('Team Ranking API test failed:', error);
                alert(`Team Ranking API Test Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Test API
          </button>

          <button
            onClick={async () => {
              try {
                console.log('Triggering aggregation for rankings...');
                const aggResponse = await fetch('/api/v1/user-tracking/aggregate', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ weeks: selectedWeeks })
                });
                console.log('Aggregation response status:', aggResponse.status);
                const aggData = await aggResponse.json();
                console.log('Aggregation response data:', aggData);
                alert(`Aggregation: ${aggResponse.status} - Processed: ${aggData.data?.processed || 0} records`);
                
                // Reload rankings after aggregation
                if (aggResponse.ok) {
                  loadRankings();
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

          <select
            value={selectedWeeks}
            onChange={(e) => setSelectedWeeks(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={26}>Last 6 months</option>
          </select>
        </div>
      </div>

      {/* Top 3 Performers */}
      {rankings.length >= 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top 3 Performers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rankings.slice(0, 3).map((user, index) => (
              <div 
                key={user.user_id}
                className={cn(
                  'relative p-6 rounded-xl border-2',
                  index === 0 ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20' :
                  index === 1 ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50' :
                  'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
                )}
              >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  {getRankIcon(index + 1)}
                </div>
                
                <div className="text-center mt-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                    {user.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                    {user.user_name}
                  </h3>
                  
                  <div className={cn('text-2xl font-bold mt-2', getScoreColor(user.overall_score || 0))}>
                    {Math.round(user.overall_score || 0)}%
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Utilization</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {Math.round(user.avg_utilization || 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Quality</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {Math.round(user.avg_quality || 0)}%
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/dashboard/user-tracking/users/${user.user_id}/analytics`)}
                    className="mt-4 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Rankings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Complete Rankings
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('overall_score')}
                    className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Overall Score
                    {renderSortIcon('overall_score')}
                  </button>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {rankings.map((user, index) => (
                <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index + 1)}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        #{index + 1}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {user.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {user.user_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.total_weeks} weeks tracked
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className={cn('text-lg font-bold', getScoreColor(user.overall_score || 0))}>
                        {Math.round(user.overall_score || 0)}%
                      </div>
                      <ProgressBar 
                        value={user.overall_score || 0} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(user.avg_utilization || 0)}%
                        </span>
                      </div>
                      <ProgressBar 
                        value={user.avg_utilization || 0} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(user.avg_punctuality || 0)}%
                        </span>
                      </div>
                      <ProgressBar 
                        value={user.avg_punctuality || 0} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(user.avg_quality || 0)}%
                        </span>
                      </div>
                      <ProgressBar 
                        value={user.avg_quality || 0} 
                        size="sm" 
                        className="w-20"
                      />
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {user.total_hours || 0}h
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => navigate(`/dashboard/user-tracking/users/${user.user_id}/analytics`)}
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

          {rankings.length === 0 && !loading && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No ranking data available.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
                <p>This might be because:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>No UserWeekSummary data has been aggregated yet</li>
                  <li>No users have submitted timesheets in the selected time period</li>
                  <li>You don't have access to view user data (check your role)</li>
                </ul>
                <div className="mt-4 space-y-2">
                  <p className="font-medium">Try these steps:</p>
                  <p>1. Click "Trigger Aggregation" above to process existing timesheet data</p>
                  <p>2. Check if users have submitted timesheets for the selected period</p>
                  <p>3. Verify you have manager/management permissions</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadRankings}
            className="mt-2 text-red-700 dark:text-red-300 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamRankingPage;