import React from 'react';
import { X, Search, Download, Users, ChevronDown } from 'lucide-react';
import { Employee } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useDailyAlerts } from '../../hooks/useDailyAlerts';
import { AlertGroup, AlertType } from '../../types/pro-analytics';
import { downloadCSV } from '../../utils/csvDownloader';
import { format } from 'date-fns';

interface DailyAlertsPanelProps {
  employees: Employee[];
  onClose: () => void;
  onEmployeeClick: (employee: Employee) => void;
}

const ALERT_TYPE_CONFIG: Record<AlertType, { color: string; i18nKey: keyof ReturnType<typeof useI18n>['t'] }> = {
  LATE: { color: 'red', i18nKey: 'alert.sections.late' },
  MINOR: { color: 'amber', i18nKey: 'alert.sections.minor' },
  ABSENT: { color: 'gray', i18nKey: 'alert.sections.absent' },
  HOLIDAY_WORKED: { color: 'green', i18nKey: 'alert.sections.holidayWorked' },
  HOLIDAY_NO_ATT: { color: 'blue', i18nKey: 'alert.sections.holidayNoAtt' },
};

const GroupSection: React.FC<{ group: AlertGroup; onEmployeeClick: (matricule: string) => void }> = ({ group, onEmployeeClick }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="bg-gray-50 rounded-lg">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left">
        <h3 className="font-semibold text-gray-800">{group.key}</h3>
        <div className="flex items-center space-x-4">
          {Object.entries(group.totals).map(([type, count]) => count > 0 && (
            <span key={type} className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${ALERT_TYPE_CONFIG[type.toUpperCase() as AlertType].color}-100 text-${ALERT_TYPE_CONFIG[type.toUpperCase() as AlertType].color}-800`}>
              {t(ALERT_TYPE_CONFIG[type.toUpperCase() as AlertType].i18nKey)}: {count}
            </span>
          ))}
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-gray-200">
          {group.items.map(item => (
            <div key={item.matricule} onClick={() => onEmployeeClick(item.matricule)} className={`flex items-center justify-between p-3 border-l-4 border-${ALERT_TYPE_CONFIG[item.reasonTag].color}-500 hover:bg-gray-100 cursor-pointer`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500 font-mono">{item.matricule}</p>
                {item.note && <p className="text-xs text-gray-500 mt-1 italic truncate" title={item.note}>N.B: {item.note}</p>}
              </div>
              <div className="text-right text-sm flex-shrink-0 ml-4">
                <p className={`font-semibold text-${ALERT_TYPE_CONFIG[item.reasonTag].color}-700`}>{t(ALERT_TYPE_CONFIG[item.reasonTag].i18nKey)}</p>
                {item.delayMin && <p className="text-xs text-gray-600">{item.delayMin} {t('unit_min')}</p>}
                {item.reasonTag === 'HOLIDAY_WORKED' && item.hours && <p className="text-xs text-gray-600">{item.hours}h</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const DailyAlertsPanel: React.FC<DailyAlertsPanelProps> = ({ employees, onClose, onEmployeeClick }) => {
  const { t } = useI18n();
  const { date, handleDateChange, searchText, setSearchText, groupBy, setGroupBy, alertsData } = useDailyAlerts(employees);

  const handleExport = () => {
    const csvData: any[][] = [['Department', 'Matricule', 'Name', 'Alert Type', 'Details (min/hr)', 'Note']];
    alertsData.groups.forEach(group => {
        group.items.forEach(item => {
            const detail = item.delayMin ? `${item.delayMin} min` : item.hours ? `${item.hours}h` : '';
            csvData.push([group.key, item.matricule, item.name, t(ALERT_TYPE_CONFIG[item.reasonTag].i18nKey), detail, item.note || '']);
        });
    });
    downloadCSV(csvData, `daily_alerts_${format(date, 'yyyy-MM-dd')}.csv`);
  };
  
  const handleInternalEmployeeClick = (matricule: string) => {
    const employee = employees.find(e => e.matricule === matricule);
    if (employee) {
        onEmployeeClick(employee);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl">
          <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
            <div className="bg-gray-50 px-4 sm:px-6 py-4">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900" id="slide-over-title">{t('alert.title')}</h2>
                <div className="ml-3 flex h-7 items-center">
                  <button type="button" className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500 focus:outline-none" onClick={onClose}><X /></button>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex flex-wrap gap-4 items-center">
                <input type="date" value={format(date, 'yyyy-MM-dd')} onChange={e => handleDateChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"/>
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder={t('filters.search')} value={searchText} onChange={e => setSearchText(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"/>
                </div>
                <button onClick={handleExport} className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" /> {t('actions.export')}
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 space-y-4">
              {alertsData.groups.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('alerts.noAlerts')}</h3>
                </div>
              ) : (
                alertsData.groups.map(group => (
                  <GroupSection key={group.key} group={group} onEmployeeClick={handleInternalEmployeeClick} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyAlertsPanel;
