import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Employee } from '../../types';
import DailyAlertsPanel from './DailyAlertsPanel';

interface AlertsHeaderIconProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
}

const AlertsHeaderIcon: React.FC<AlertsHeaderIconProps> = ({ employees, onEmployeeClick }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsPanelOpen(true)} 
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
        aria-label="Open daily alerts"
      >
        <Bell className="h-6 w-6" />
        {/* Badge can be added here later */}
      </button>
      
      {isPanelOpen && (
        <DailyAlertsPanel 
          employees={employees}
          onClose={() => setIsPanelOpen(false)}
          onEmployeeClick={onEmployeeClick}
        />
      )}
    </>
  );
};

export default AlertsHeaderIcon;
