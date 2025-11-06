import React, { useState, useEffect } from 'react';
import { backendApi } from '../lib/backendApi';

interface DropdownDebugInfo {
  clients: any[];
  users: any[];
  managers: any[];
  apiCalls: {
    clients: { success: boolean; error?: string; responseTime?: number };
    users: { success: boolean; error?: string; responseTime?: number };
  };
}

/**
 * Debugging component to verify dropdown data flow
 * Add this component temporarily to test dropdown population
 */
const VoiceDropdownDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DropdownDebugInfo>({
    clients: [],
    users: [],
    managers: [],
    apiCalls: {
      clients: { success: false },
      users: { success: false }
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const testDropdownAPIs = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      // Test clients API
      let clientsResult = { success: false, error: '', responseTime: 0 };
      let clientsData: any[] = [];
      
      try {
        const clientsStart = Date.now();
        const clientsResponse = await backendApi.get<{ success: boolean; data: any[] }>('/clients');
        clientsResult.responseTime = Date.now() - clientsStart;
        
        if (clientsResponse.success && clientsResponse.data) {
          clientsResult.success = true;
          clientsData = clientsResponse.data;
        } else {
          clientsResult.error = 'No data in response';
        }
      } catch (error) {
        clientsResult.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test users API
      let usersResult = { success: false, error: '', responseTime: 0 };
      let usersData: any[] = [];
      let managersData: any[] = [];
      
      try {
        const usersStart = Date.now();
        const usersResponse = await backendApi.get<{ success: boolean; users: any[] }>('/users');
        usersResult.responseTime = Date.now() - usersStart;
        
        if (usersResponse.success && usersResponse.users) {
          usersResult.success = true;
          usersData = usersResponse.users;
          
          // Filter managers
          managersData = usersResponse.users.filter((u: any) => 
            u.role?.toLowerCase() === 'manager' // Only actual managers, not management/lead/super_admin
          );
        } else {
          usersResult.error = 'No users in response';
        }
      } catch (error) {
        usersResult.error = error instanceof Error ? error.message : 'Unknown error';
      }

      setDebugInfo({
        clients: clientsData,
        users: usersData,
        managers: managersData,
        apiCalls: {
          clients: clientsResult,
          users: usersResult
        }
      });

    } catch (error) {
      console.error('Debug test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testDropdownAPIs();
  }, []);

  const renderApiStatus = (apiName: string, result: { success: boolean; error?: string; responseTime?: number }) => (
    <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className="font-medium">{apiName} API</span>
        {result.responseTime && <span className="text-sm text-gray-600">({result.responseTime}ms)</span>}
      </div>
      {result.error && <div className="text-sm text-red-600 mt-1">Error: {result.error}</div>}
    </div>
  );

  const renderDataSample = (title: string, data: any[], colorClass: string) => (
    <div className={`p-4 rounded-md border ${colorClass}`}>
      <h4 className="font-medium mb-2">{title} ({data.length} items)</h4>
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.slice(0, 3).map((item, index) => (
            <div key={index} className="text-sm bg-white p-2 rounded border">
              <div><strong>ID:</strong> {item._id || item.id || 'No ID'}</div>
              <div><strong>Name:</strong> {item.client_name || item.full_name || item.name || 'No Name'}</div>
              {item.role && <div><strong>Role:</strong> {item.role}</div>}
              {item.contact_email && <div><strong>Email:</strong> {item.contact_email}</div>}
            </div>
          ))}
          {data.length > 3 && <div className="text-sm text-gray-600">... and {data.length - 3} more</div>}
        </div>
      ) : (
        <div className="text-sm text-gray-600">No data available</div>
      )}
    </div>
  );

  const generateDropdownOptions = () => {
    const clientOptions = debugInfo.clients.map(c => ({
      value: c._id || c.id,
      label: c.client_name || c.name
    }));

    const userOptions = debugInfo.users.map(u => ({
      value: u._id || u.id,
      label: u.full_name || u.name
    }));

    const managerOptions = debugInfo.managers.map(m => ({
      value: m._id || m.id,
      label: m.full_name || m.name
    }));

    const statusOptions = ['Active', 'Completed', 'Archived'].map(s => ({
      value: s,
      label: s
    }));

    return { clientOptions, userOptions, managerOptions, statusOptions };
  };

  const { clientOptions, userOptions, managerOptions, statusOptions } = generateDropdownOptions();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🧪 Voice Dropdown Debugger</h2>
        <button
          onClick={testDropdownAPIs}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Testing...' : 'Refresh Test'}
        </button>
      </div>

      {/* API Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🔌 API Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderApiStatus('Clients', debugInfo.apiCalls.clients)}
          {renderApiStatus('Users', debugInfo.apiCalls.users)}
        </div>
      </div>

      {/* Raw Data */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📊 Raw Data from APIs</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderDataSample('Clients', debugInfo.clients, 'bg-blue-50 border-blue-200')}
          {renderDataSample('All Users', debugInfo.users, 'bg-green-50 border-green-200')}
          {renderDataSample('Managers Only', debugInfo.managers, 'bg-purple-50 border-purple-200')}
        </div>
      </div>

      {/* Dropdown Options */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🎯 Generated Dropdown Options</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Client Dropdown */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium mb-2">Client Dropdown (Reference Type)</h4>
            <select className="w-full p-2 border rounded">
              <option value="">-- Select Client --</option>
              {clientOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-600 mt-1">
              {clientOptions.length} options from /clients API
            </div>
          </div>

          {/* Manager Dropdown */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
            <h4 className="font-medium mb-2">Manager Dropdown (Reference Type)</h4>
            <select className="w-full p-2 border rounded">
              <option value="">-- Select Manager --</option>
              {managerOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-600 mt-1">
              {managerOptions.length} options from filtered /users API
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium mb-2">Status Dropdown (Enum Type)</h4>
            <select className="w-full p-2 border rounded">
              <option value="">-- Select Status --</option>
              {statusOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-600 mt-1">
              {statusOptions.length} options from intent definition enum
            </div>
          </div>

          {/* All Users (for comparison) */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-medium mb-2">All Users (for comparison)</h4>
            <select className="w-full p-2 border rounded">
              <option value="">-- Select User --</option>
              {userOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-600 mt-1">
              {userOptions.length} options (should be more than managers)
            </div>
          </div>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3">✅ Verification Checklist</h3>
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 ${debugInfo.apiCalls.clients.success ? 'text-green-600' : 'text-red-600'}`}>
            <span>{debugInfo.apiCalls.clients.success ? '✅' : '❌'}</span>
            <span>Clients API returns data</span>
          </div>
          <div className={`flex items-center gap-2 ${debugInfo.apiCalls.users.success ? 'text-green-600' : 'text-red-600'}`}>
            <span>{debugInfo.apiCalls.users.success ? '✅' : '❌'}</span>
            <span>Users API returns data</span>
          </div>
          <div className={`flex items-center gap-2 ${debugInfo.managers.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{debugInfo.managers.length > 0 ? '✅' : '❌'}</span>
            <span>Manager filtering works (found {debugInfo.managers.length} managers)</span>
          </div>
          <div className={`flex items-center gap-2 ${debugInfo.managers.length < debugInfo.users.length ? 'text-green-600' : 'text-red-600'}`}>
            <span>{debugInfo.managers.length < debugInfo.users.length ? '✅' : '❌'}</span>
            <span>Managers are properly filtered (less than total users)</span>
          </div>
          <div className={`flex items-center gap-2 ${clientOptions.every(opt => opt.value && opt.label) ? 'text-green-600' : 'text-red-600'}`}>
            <span>{clientOptions.every(opt => opt.value && opt.label) ? '✅' : '❌'}</span>
            <span>Client options have both value and label</span>
          </div>
          <div className={`flex items-center gap-2 ${managerOptions.every(opt => opt.value && opt.label) ? 'text-green-600' : 'text-red-600'}`}>
            <span>{managerOptions.every(opt => opt.value && opt.label) ? '✅' : '❌'}</span>
            <span>Manager options have both value and label</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceDropdownDebugger;