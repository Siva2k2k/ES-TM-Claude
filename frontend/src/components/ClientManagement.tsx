import React, { useState, useEffect } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { useAuth } from '../store/contexts/AuthContext';
import { ClientService } from '../services/ClientService';
import { showSuccess, showError, showWarning } from '../utils/toast';
import { DeleteButton } from './common/DeleteButton';
import {
  Building,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  Users,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  X,
  Save
} from 'lucide-react';
import type { Client } from '../types';

interface ClientWithProjects extends Client {
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date?: string;
    is_billable: boolean;
  }>;
  total_projects?: number;
  active_projects?: number;
}

interface ClientFormData {
  name: string;
  contact_person: string;
  contact_email: string;
  is_active: boolean;
}

export const ClientManagement: React.FC = () => {
  const { canManageProjects, currentRole, hasPermission } = useRoleManager();
  const { currentUser } = useAuth();

  // State management
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // View states
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedClient, setSelectedClient] = useState<ClientWithProjects | null>(null);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithProjects | null>(null);

  const [clientForm, setClientForm] = useState<ClientFormData>({
    name: '',
    contact_person: '',
    contact_email: '',
    is_active: true
  });

  // Permission checks - Role-based access control
  const canManageClients = ['management', 'super_admin'].includes(currentRole);
  const canViewClientsOnly = ['manager', 'lead', 'employee'].includes(currentRole);
  const canViewClients = canManageClients || canViewClientsOnly;

  // CRUD permissions (only for management roles)
  const canCreateClients = canManageClients;
  const canEditClients = canManageClients;
  const canDeleteClients = canManageClients;

  // Load clients data
  useEffect(() => {
    if (canViewClients) {
      loadClients();
    }
  }, [refreshTrigger, canViewClients]);

  // Filter clients
  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await ClientService.getAllClients(true); // Include inactive clients

      if (result.error) {
        setError(result.error);
      } else {
        setClients(result.clients || []);
      }
    } catch (err) {
      setError('Failed to load clients');
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(client => client.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(client => !client.is_active);
    }

    setFilteredClients(filtered);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateClients) {
      showError('You do not have permission to create clients');
      return;
    }

    // Validate client name
    if (clientForm.name.trim().length < 2) {
      showWarning('Client name must be at least 2 characters long');
      return;
    }

    if (clientForm.name.trim().length > 100) {
      showWarning('Client name must be less than 100 characters');
      return;
    }

    // Validate email format if provided
    if (clientForm.contact_email && clientForm.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientForm.contact_email.trim())) {
        showWarning('Please enter a valid email address');
        return;
      }
    }

    // Prevent numeric-only names on the client as an early check
    if (/^\d+$/.test(clientForm.name.trim())) {
      showWarning('Client name cannot be only numbers');
      return;
    }

    try {
      const result = await ClientService.createClient({
        ...clientForm,
        name: clientForm.name.trim(),
        contact_person: clientForm.contact_person?.trim(),
        contact_email: clientForm.contact_email?.trim()
      });

      if (result.error) {
        if ((result as any).status === 409) {
          showError('A client with this name already exists');
        } else {
          showError(`Error creating client: ${result.error}`);
        }
        return;
      }

      showSuccess('Client created successfully');
      setShowCreateModal(false);
      resetForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error creating client');
      console.error('Error creating client:', err);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingClient || !canEditClients) {
      showError('You do not have permission to edit clients');
      return;
    }

    // Validate client name
    if (clientForm.name.trim().length < 2) {
      showWarning('Client name must be at least 2 characters long');
      return;
    }

    if (clientForm.name.trim().length > 100) {
      showWarning('Client name must be less than 100 characters');
      return;
    }

    // Validate email format if provided
    if (clientForm.contact_email && clientForm.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientForm.contact_email.trim())) {
        showWarning('Please enter a valid email address');
        return;
      }
    }

    // Prevent numeric-only names on the client as an early check
    if (/^\d+$/.test(clientForm.name.trim())) {
      showWarning('Client name cannot be only numbers');
      return;
    }

    try {
      const result = await ClientService.updateClient(editingClient.id, {
        ...clientForm,
        name: clientForm.name.trim(),
        contact_person: clientForm.contact_person?.trim(),
        contact_email: clientForm.contact_email?.trim()
      });

      if (result.error) {
        showError(`Error updating client: ${result.error}`);
        return;
      }

      showSuccess('Client updated successfully');
      setShowEditModal(false);
      setEditingClient(null);
      resetForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error updating client');
      console.error('Error updating client:', err);
    }
  };

  const handleDeactivateClient = async (clientId: string) => {
    if (!canEditClients) {
      showError('You do not have permission to deactivate clients');
      return;
    }

    if (!confirm('Are you sure you want to deactivate this client?')) return;

    try {
      const result = await ClientService.deactivateClient(clientId);

      if (result.error) {
        // Check if it's the active projects error
        if (result.error.includes('active project')) {
          const projectCount = result.error.match(/(\d+) active project/)?.[1] || 'some';
          showWarning(
            `Cannot deactivate client: ${projectCount} active project(s) found. Please complete or archive all active projects for this client first, then try again. You can manage projects in the Project Management section.`
          );
        } else {
          showError(`Error deactivating client: ${result.error}`);
        }
        return;
      }

      showSuccess('Client deactivated successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error deactivating client');
      console.error('Error deactivating client:', err);
    }
  };

  const handleReactivateClient = async (clientId: string) => {
    if (!canEditClients) {
      showError('You do not have permission to reactivate clients');
      return;
    }

    try {
      const result = await ClientService.reactivateClient(clientId);

      if (result.error) {
        showError(`Error reactivating client: ${result.error}`);
        return;
      }

      showSuccess('Client reactivated successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error reactivating client');
      console.error('Error reactivating client:', err);
    }
  };

  const handleDeleteClient = async (entityType: string, entityId: string, deleteType: 'soft' | 'hard') => {
    if (!canDeleteClients) {
      showError('You do not have permission to delete clients');
      return;
    }

    try {
      const result = await ClientService.deleteClient(entityId);

      if (result.error) {
        showError(`Error deleting client: ${result.error}`);
        return;
      }

      if (deleteType === 'soft') {
        showSuccess('Client moved to trash successfully');
      } else {
        showSuccess('Client permanently deleted');
      }
      
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error deleting client');
      console.error('Error deleting client:', err);
    }
  };

  const handleViewDetails = async (client: ClientWithProjects) => {
    try {
      const result = await ClientService.getClientById(client.id);

      if (result.error) {
        showError(`Error loading client details: ${result.error}`);
        return;
      }

      setSelectedClient(result.client || null);
      setShowDetailsModal(true);
    } catch (err) {
      showError('Error loading client details');
      console.error('Error loading client details:', err);
    }
  };

  const resetForm = () => {
    setClientForm({
      name: '',
      contact_person: '',
      contact_email: '',
      is_active: true
    });
  };

  const openEditModal = (client: ClientWithProjects) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      contact_person: client.contact_person || '',
      contact_email: client.contact_email || '',
      is_active: client.is_active
    });
    setShowEditModal(true);
  };

  // Access control
  if (!canViewClients) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Client Management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
              <p className="text-gray-600">
                {canCreateClients
                  ? 'Manage clients and their project associations'
                  : 'View clients associated with your projects'}
              </p>
            </div>
            {canCreateClients && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Client Overview ({filteredClients.length})
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Clients ({filteredClients.length})
              </h3>
            </div>

            {filteredClients.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <div key={client.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1 sm:mt-0">
                          <Building className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {client.name}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit mt-1 sm:mt-0 ${
                              client.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {client.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600">
                            {client.contact_person && (
                              <div className="flex items-center min-w-0">
                                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate sm:line-clamp-2">{client.contact_person}</span>
                              </div>
                            )}
                            {client.contact_email && (
                              <div className="flex items-center min-w-0">
                                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate sm:line-clamp-2">{client.contact_email}</span>
                              </div>
                            )}
                            <div className="flex items-center min-w-0">
                              <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate sm:line-clamp-2">{client.total_projects || 0} projects ({client.active_projects || 0} active)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 sm:space-x-2 ml-0 sm:ml-4 mt-2 sm:mt-0">
                        <button
                          onClick={() => handleViewDetails(client)}
                          className="text-blue-600 hover:text-blue-900 p-1.5 sm:p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        {canEditClients && (
                          <>
                            <button
                              onClick={() => openEditModal(client)}
                              className="text-gray-600 hover:text-gray-900 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit client"
                            >
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>

                            {client.is_active ? (
                              <button
                                onClick={() => handleDeactivateClient(client.id)}
                                className="text-yellow-600 hover:text-yellow-900 p-1.5 sm:p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Deactivate client"
                              >
                                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateClient(client.id)}
                                className="text-green-600 hover:text-green-900 p-1.5 sm:p-2 hover:bg-green-50 rounded-lg transition-colors"
                                title="Reactivate client"
                              >
                                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            )}

                            {canDeleteClients && (
                              <DeleteButton
                                onDelete={handleDeleteClient}
                                entityName={client.name}
                                entityId={client.id}
                                entityType="client"
                                variant="icon"
                                disabled={client.total_projects! > 0}
                                disabledReason={client.total_projects! > 0 ? `Cannot delete client with ${client.total_projects} active projects` : undefined}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Building className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : canCreateClients
                    ? 'Create your first client to get started.'
                    : 'No clients have been created yet.'}
                </p>
                {canCreateClients && !searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Client
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Client Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Client</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={clientForm.contact_person}
                    onChange={(e) => setClientForm({...clientForm, contact_person: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={clientForm.contact_email}
                    onChange={(e) => setClientForm({...clientForm, contact_email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact email"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={clientForm.is_active}
                      onChange={(e) => setClientForm({...clientForm, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Client</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Client Modal */}
        {showEditModal && editingClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Client: {editingClient.name}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={clientForm.contact_person}
                    onChange={(e) => setClientForm({...clientForm, contact_person: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={clientForm.contact_email}
                    onChange={(e) => setClientForm({...clientForm, contact_email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={clientForm.is_active}
                      onChange={(e) => setClientForm({...clientForm, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Client</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingClient(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Client Details Modal */}
        {showDetailsModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedClient.name} Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Client Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedClient.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedClient.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {selectedClient.contact_person && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                      <p className="text-gray-900">{selectedClient.contact_person}</p>
                    </div>
                  )}

                  {selectedClient.contact_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <p className="text-gray-900">{selectedClient.contact_email}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Projects</label>
                    <p className="text-gray-900">
                      {selectedClient.total_projects || 0} total ({selectedClient.active_projects || 0} active)
                    </p>
                  </div>
                </div>

                {/* Projects List */}
                {selectedClient.projects && selectedClient.projects.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Associated Projects</h4>
                    <div className="space-y-2">
                      {selectedClient.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h5 className="font-medium text-gray-900">{project.name}</h5>
                            <p className="text-sm text-gray-600">
                              {new Date(project.start_date).toLocaleDateString()}
                              {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              project.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : project.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                            {project.is_billable && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                Billable
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};