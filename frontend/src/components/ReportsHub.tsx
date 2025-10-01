import React, { useState } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import ReportDashboard from './ReportDashboard';
import ReportBuilder from './ReportBuilder';
import LiveAnalyticsDashboard from './LiveAnalyticsDashboard';
import ReportHistory from './ReportHistory';
import CustomReportBuilder from './CustomReportBuilder';
import { ReportTemplate } from '../services/ReportService';

type TabType = 'dashboard' | 'analytics' | 'history' | 'custom';

const ReportsHub: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // Check if user can create custom reports
  const canCreateCustomReports = user?.role === 'management' || user?.role === 'super_admin';

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Reports', icon: '📊' },
    { id: 'analytics', label: 'Live Analytics', icon: '📈' },
    { id: 'history', label: 'History', icon: '📚' }
  ];

  if (canCreateCustomReports) {
    tabs.push({ id: 'custom', label: 'Custom Builder', icon: '🛠️' });
  }

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
  };

  const handleBackToDashboard = () => {
    setSelectedTemplate(null);
  };

  const renderContent = () => {
    // If a template is selected, show the builder
    if (selectedTemplate) {
      return <ReportBuilder template={selectedTemplate} onBack={handleBackToDashboard} />;
    }

    // Otherwise show the active tab
    switch (activeTab) {
      case 'dashboard':
        return <ReportDashboard onSelectTemplate={handleSelectTemplate} />;
      case 'analytics':
        return <LiveAnalyticsDashboard />;
      case 'history':
        return <ReportHistory />;
      case 'custom':
        return <CustomReportBuilder />;
      default:
        return <ReportDashboard onSelectTemplate={handleSelectTemplate} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Only show if no template is selected */}
      {!selectedTemplate && (
        <div className="bg-white rounded-lg shadow p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default ReportsHub;
