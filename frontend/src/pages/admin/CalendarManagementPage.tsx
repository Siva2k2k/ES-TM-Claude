import React from 'react';
import { CalendarManagement } from '../../components/settings/CalendarManagement';

export const CalendarManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <CalendarManagement />
    </div>
  );
};

export default CalendarManagementPage;