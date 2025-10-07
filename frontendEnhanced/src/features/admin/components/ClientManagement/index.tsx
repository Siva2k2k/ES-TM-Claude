/**
 * ClientManagement Component
 * Admin interface for managing clients
 * Simplified version focusing on core functionality
 */

import React, { useEffect, useState } from 'react';
import { Building, Plus, Search, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useClientManagement } from '../../hooks/useClientManagement';
import { useAuthContext } from '../../../auth';
import type { Client, ClientFormData } from '../../types/admin.types';

export interface ClientManagementProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Client management component
 * Complexity: 7
 * LOC: ~240
 */
export const ClientManagement: React.FC<ClientManagementProps> = ({ className = '' }) => {
  const { user: currentUser } = useAuthContext();
  const {
    clients,
    isLoading,
    error,
    loadClients,
    createClient,
    deleteClient,
  } = useClientManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    contact_person: '',
    contact_email: '',
    is_active: true,
  });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadClients(true); // Include inactive
  }, [loadClients]);

  // Permission check
  const canManageClients = ['super_admin', 'admin', 'manager'].includes(currentUser?.role || '');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (formData.name.trim().length < 2) {
      setFormError('Client name must be at least 2 characters');
      return;
    }

    setCreating(true);
    const result = await createClient(formData);
    setCreating(false);

    if (result.error) {
      setFormError(result.error);
    } else {
      setShowCreateForm(false);
      setFormData({ name: '', contact_person: '', contact_email: '', is_active: true });
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete "${clientName}"?`)) return;

    await deleteClient(clientId);
  };

  if (!canManageClients) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Access Denied
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            You don't have permission to access Client Management.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && clients.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-text-secondary dark:text-dark-text-secondary">Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Error Loading Clients
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-4">{error}</p>
          <Button onClick={() => loadClients(true)} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
            <Building className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
            Client Management
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-1">
            Manage clients and their information
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-dark-800 shadow-sm rounded-lg border border-gray-200 dark:border-dark-border p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-4">
            Create New Client
          </h3>
          {formError && (
            <div className="mb-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-3">
              <p className="text-error-700 dark:text-error-300 text-sm">{formError}</p>
            </div>
          )}
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                  Client Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter client name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                  Contact Person
                </label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Enter contact person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="Enter contact email"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search clients..."
          className="pl-10"
        />
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <Building className="h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
            {searchTerm ? 'No Clients Found' : 'No Clients'}
          </h3>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by adding your first client.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-800 shadow-sm rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                  Client Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredClients.map((client: Client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                      {client.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                    {client.contact_person || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                    {client.contact_email || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        client.is_active
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClient(client.id, client.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
