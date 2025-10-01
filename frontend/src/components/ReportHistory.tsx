import React, { useState, useEffect } from 'react';
import { ReportService, ReportHistoryItem } from '../services/ReportService';
import { showError, showInfo } from '../utils/toast';

const ReportHistory: React.FC = () => {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'pdf' | 'excel' | 'csv'>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, searchQuery, statusFilter, formatFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await ReportService.getReportHistory(100);

      if (result.success) {
        setHistory(result.history);
      } else {
        showError(result.error || 'Failed to load report history');
      }
    } catch (error) {
      console.error('Error loading report history:', error);
      showError('Failed to load report history');
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = history;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.template_name.toLowerCase().includes(query) ||
        item.generated_by.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by format
    if (formatFilter !== 'all') {
      filtered = filtered.filter(item => item.format === formatFilter);
    }

    setFilteredHistory(filtered);
  };

  const handleRedownload = async (item: ReportHistoryItem) => {
    if (!item.file_path) {
      showError('File path not available for this report');
      return;
    }

    // Note: This requires a backend endpoint to serve historical reports
    // For now, show a message
    showInfo('Re-download functionality requires backend implementation');

    // TODO: Implement re-download endpoint
    // const url = `${import.meta.env.VITE_API_URL}/api/v1/reports/download/${item.id}`;
    // window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">✅ Completed</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">❌ Failed</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">⏳ Processing</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">{status}</span>;
    }
  };

  const getFormatIcon = (format: string): string => {
    const iconMap: { [key: string]: string } = {
      pdf: '📄',
      excel: '📊',
      csv: '📋'
    };
    return iconMap[format] || '📁';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📚 Report History</h1>
            <p className="text-gray-600 mt-1">View and manage previously generated reports</p>
          </div>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by template or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="completed">✅ Completed</option>
            <option value="processing">⏳ Processing</option>
            <option value="failed">❌ Failed</option>
          </select>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Formats</option>
            <option value="pdf">📄 PDF</option>
            <option value="excel">📊 Excel</option>
            <option value="csv">📋 CSV</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{history.length}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {history.filter(h => h.status === 'completed').length}
              </p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-blue-600">
                {history.filter(h => h.status === 'processing').length}
              </p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {history.filter(h => h.status === 'failed').length}
              </p>
            </div>
            <span className="text-3xl">❌</span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-lg shadow">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500">
              {history.length === 0
                ? 'No reports generated yet'
                : 'No reports found matching your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.template_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {item.template_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.generated_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(item.generated_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium">
                        {getFormatIcon(item.format)} {item.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.status === 'completed' && item.file_path ? (
                        <button
                          onClick={() => handleRedownload(item)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          📥 Download
                        </button>
                      ) : item.status === 'failed' ? (
                        <div className="text-red-600" title={item.error}>
                          ⚠️ Error
                        </div>
                      ) : item.status === 'processing' ? (
                        <div className="text-blue-600">
                          <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Details Modal - Could be expanded */}
      {filteredHistory.some(h => h.status === 'failed' && h.error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ Recent Errors</h3>
          <div className="space-y-2">
            {filteredHistory
              .filter(h => h.status === 'failed' && h.error)
              .slice(0, 3)
              .map(item => (
                <div key={item.id} className="text-sm text-red-800">
                  <span className="font-medium">{item.template_name}:</span> {item.error}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;
