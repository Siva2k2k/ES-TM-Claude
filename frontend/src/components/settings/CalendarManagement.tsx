import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Copy,
  Settings,
  Clock,
  Globe,
  Users,
  MapPin,
  User
} from 'lucide-react';
import { CalendarService, type Calendar, type CalendarType, type CreateCalendarData } from '../../services/CalendarService';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';

const CALENDAR_TYPE_CONFIG: Record<CalendarType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  system: { icon: Settings, label: 'System', color: 'bg-purple-100 text-purple-800' },
  company: { icon: Users, label: 'Company', color: 'bg-blue-100 text-blue-800' },
  regional: { icon: MapPin, label: 'Regional', color: 'bg-green-100 text-green-800' },
  personal: { icon: User, label: 'Personal', color: 'bg-orange-100 text-orange-800' }
};

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

interface CalendarFormData extends CreateCalendarData {
  is_default?: boolean;
}

export const CalendarManagement: React.FC = () => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [cloningCalendar, setCloningCalendar] = useState<Calendar | null>(null);

  // Form state
  const [formData, setFormData] = useState<CalendarFormData>({
    name: '',
    description: '',
    type: 'company',
    timezone: 'UTC',
    working_days: [1, 2, 3, 4, 5], // Monday-Friday
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    working_hours_per_day: 8,
    is_default: false
  });

  const loadCalendars = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await CalendarService.getCalendars();

      if (result.error) {
        setError(result.error);
      } else {
        setCalendars(result.calendars);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendars';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendars();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let result;

      if (editingCalendar) {
        result = await CalendarService.updateCalendar(editingCalendar.id, formData);
      } else if (cloningCalendar) {
        result = await CalendarService.cloneCalendar(cloningCalendar.id, {
          name: formData.name,
          description: formData.description,
          type: formData.type
        });
      } else {
        result = await CalendarService.createCalendar(formData);
      }

      if (result.error) {
        alert(result.error);
      } else {
        setShowForm(false);
        setEditingCalendar(null);
        setCloningCalendar(null);
        resetForm();
        loadCalendars();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save calendar';
      alert(errorMessage);
    }
  };

  const handleEdit = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setFormData({
      name: calendar.name,
      description: calendar.description || '',
      type: calendar.type,
      timezone: calendar.timezone,
      working_days: [...calendar.working_days],
      business_hours_start: calendar.business_hours_start,
      business_hours_end: calendar.business_hours_end,
      working_hours_per_day: calendar.working_hours_per_day,
      is_default: calendar.is_default
    });
    setShowForm(true);
  };

  const handleClone = (calendar: Calendar) => {
    setCloningCalendar(calendar);
    setFormData({
      name: `${calendar.name} (Copy)`,
      description: calendar.description,
      type: calendar.type,
      timezone: calendar.timezone,
      working_days: [...calendar.working_days],
      business_hours_start: calendar.business_hours_start,
      business_hours_end: calendar.business_hours_end,
      working_hours_per_day: calendar.working_hours_per_day,
      is_default: false
    });
    setShowForm(true);
  };

  const handleDelete = async (calendar: Calendar) => {
    if (!confirm(`Are you sure you want to delete "${calendar.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await CalendarService.deleteCalendar(calendar.id);

      if (result.error) {
        alert(result.error);
      } else {
        loadCalendars();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete calendar';
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'company',
      timezone: 'UTC',
      working_days: [1, 2, 3, 4, 5],
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      working_hours_per_day: 8,
      is_default: false
    });
  };

  const handleNewCalendar = () => {
    setEditingCalendar(null);
    setCloningCalendar(null);
    resetForm();
    setShowForm(true);
  };

  const handleWorkingDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day].sort()
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading calendars...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6" />
              Calendar Management
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Manage calendars for holidays, working days, and timesheet calculations
            </p>
          </div>
          <Button onClick={handleNewCalendar} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Calendar
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {calendars.map((calendar) => {
            const typeConfig = CALENDAR_TYPE_CONFIG[calendar.type];
            const TypeIcon = typeConfig.icon;

            return (
              <Card key={calendar.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{calendar.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                          {calendar.is_default && (
                            <Badge variant="success">Default</Badge>
                          )}
                          {!calendar.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {calendar.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{calendar.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{calendar.timezone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{calendar.working_hours_per_day}h/day</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{calendar.working_days.length} working days</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(calendar)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(calendar)}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Clone
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(calendar)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {calendars.length === 0 && !error && (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calendars found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first calendar</p>
            <Button onClick={handleNewCalendar}>
              <Plus className="h-4 w-4 mr-2" />
              Create Calendar
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCalendar(null);
          setCloningCalendar(null);
        }}
        title={editingCalendar ? 'Edit Calendar' : cloningCalendar ? 'Clone Calendar' : 'Create Calendar'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="e.g., Company Standard Calendar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <Select
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value as CalendarType }))}
                disabled={!!editingCalendar} // Can't change type when editing
              >
                {Object.entries(CALENDAR_TYPE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this calendar"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <Select
                value={formData.timezone}
                onChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Australia/Sydney">Sydney</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Working Hours Per Day
              </label>
              <Input
                type="number"
                min="1"
                max="24"
                value={formData.working_hours_per_day}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  working_hours_per_day: parseInt(e.target.value) || 8
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Hours Start
              </label>
              <Input
                type="time"
                value={formData.business_hours_start}
                onChange={(e) => setFormData(prev => ({ ...prev, business_hours_start: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Hours End
              </label>
              <Input
                type="time"
                value={formData.business_hours_end}
                onChange={(e) => setFormData(prev => ({ ...prev, business_hours_end: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.working_days.includes(day.value)}
                    onChange={() => handleWorkingDayToggle(day.value)}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          {!cloningCalendar && (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_default || false}
                onChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                disabled={!!editingCalendar && editingCalendar.is_default} // Can't uncheck if already default
              />
              <label className="text-sm font-medium text-gray-700">
                Set as default calendar for this type
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingCalendar(null);
                setCloningCalendar(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingCalendar ? 'Update' : cloningCalendar ? 'Clone' : 'Create'} Calendar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};