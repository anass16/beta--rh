import React, { useState, useEffect, useMemo } from 'react';
import { X, Briefcase, CalendarOff, Clock, AlertTriangle, Star, TrendingUp, TrendingDown, Hourglass, PlusCircle } from 'lucide-react';
import { Employee } from '../types';
import { MonthlyKPI, Absence } from '../types/pro-analytics';
import { computeUserMonthlyKpi } from '../utils/proAnalyticsEngine';
import { useI18n } from '../contexts/I18nContext';
import { useAbsenceCache } from '../hooks/useAbsenceCache';
import AbsenceList from './absences/AbsenceList';
import AbsenceFormModal from './absences/AbsenceFormModal';
import { addAbsence, updateAbsence, deleteAbsence, invalidateCache } from '../services/absenceManager';

interface EmployeeDetailPanelProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void; // This is kept for now for other potential data changes
}

const KPICard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; unit?: string }> = ({ label, value, icon, unit }) => (
  <div className="bg-gray-50 p-3 rounded-lg flex items-center">
    <div className="p-2 bg-gray-200 rounded-full mr-3">{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="text-lg font-bold text-gray-900">
        {value} <span className="text-xs font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="bg-gray-100 p-3 rounded-lg flex items-center animate-pulse">
    <div className="p-2 bg-gray-200 rounded-full mr-3 h-10 w-10"></div>
    <div>
      <div className="h-3 bg-gray-300 rounded w-20 mb-2"></div>
      <div className="h-5 bg-gray-300 rounded w-12"></div>
    </div>
  </div>
);

const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({ employee, isOpen, onClose, onDataChanged }) => {
  const { t } = useI18n();
  const [kpiData, setKpiData] = useState<MonthlyKPI | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);

  const today = useMemo(() => new Date(), []);
  const { data: absenceData, isLoading: isAbsenceLoading, cacheKey } = useAbsenceCache({
    year: today.getFullYear(),
    month: today.getMonth(),
    matricule: employee?.matricule,
    enabled: isOpen && !!employee,
  });

  useEffect(() => {
    if (isOpen && employee && !isAbsenceLoading) {
      const data = computeUserMonthlyKpi(employee, today.getFullYear(), today.getMonth(), absenceData, false, false);
      setKpiData(data);
    }
  }, [isOpen, employee, absenceData, isAbsenceLoading, today, cacheKey]); // Added cacheKey dependency

  const handleOpenAddAbsence = () => {
    setEditingAbsence(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditAbsence = (absence: Absence) => {
    setEditingAbsence(absence);
    setIsFormModalOpen(true);
  };

  const handleSaveAbsence = (data: Omit<Absence, 'id' | 'source' | 'createdAt' | 'updatedAt'>) => {
    let result;
    if (editingAbsence) {
      result = updateAbsence(editingAbsence.id, data);
    } else {
      result = addAbsence(data);
    }

    if (!result.success) {
        alert(result.message);
    }
    // No need to call onDataChanged, BroadcastChannel handles the update.
    setIsFormModalOpen(false);
  };
  
  const handleDeleteAbsence = (id: string) => {
    if (window.confirm(t('absence.confirm_delete'))) {
        deleteAbsence(id);
        // Invalidation is handled by deleteAbsence itself.
    }
  };


  if (!isOpen) return null;
  const isLoading = !employee || isAbsenceLoading;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
          <div className="flex h-full flex-col">
            <div className="bg-green-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-white">{employee ? `${employee.firstName} ${employee.lastName}` : t('emp_detail_loading')}</h2>
                  <p className="text-green-100 font-mono text-sm">Matricule: {employee?.matricule}</p>
                  <p className="text-green-100">{employee?.department}</p>
                </div>
                <button onClick={onClose} className="rounded-md text-green-100 hover:text-white"><X /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-800">{t('pro_analytics_title')} - {new Intl.DateTimeFormat(t('language', 'en'), { month: 'long', year: 'numeric' }).format(today)}</h3>
                {isLoading && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                )}
                {!isLoading && kpiData && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <KPICard label={t('kpi_days_worked')} value={kpiData.daysWorked} icon={<Briefcase className="w-5 h-5 text-blue-600" />} />
                    <KPICard label={t('kpi_days_absent')} value={kpiData.daysAbsent} icon={<CalendarOff className="w-5 h-5 text-red-600" />} />
                    <KPICard label={t('kpi_delta')} value={kpiData.deltaDays} icon={kpiData.deltaDays >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />} />
                    <KPICard label={t('kpi_total_hours')} value={kpiData.totalHours} unit="h" icon={<Hourglass className="w-5 h-5 text-purple-600" />} />
                    <KPICard label={t('kpi_avg_delay_min')} value={kpiData.avgDelayMin} unit={t('unit_min')} icon={<Clock className="w-5 h-5 text-yellow-600" />} />
                    <KPICard label={t('kpi_late_days')} value={kpiData.lateDays} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} />
                    <KPICard label={t('kpi_minor_delays')} value={kpiData.minorDays} icon={<Clock className="w-5 h-5 text-yellow-500" />} />
                    <KPICard label={t('kpi_holidays_worked')} value={kpiData.workedHolidays} icon={<Star className="w-5 h-5 text-teal-600" />} />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-800">{t('absence.title', { month: new Intl.DateTimeFormat(t('language', 'en'), { month: 'long' }).format(today) })}</h3>
                    <button onClick={handleOpenAddAbsence} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        {t('absence.add_button')}
                    </button>
                </div>
                <AbsenceList 
                    absences={absenceData} 
                    isLoading={isLoading}
                    onEdit={handleOpenEditAbsence}
                    onDelete={handleDeleteAbsence}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {isFormModalOpen && employee && (
        <AbsenceFormModal
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            onSave={handleSaveAbsence}
            matricule={employee.matricule}
            initialData={editingAbsence}
        />
      )}
    </>
  );
};

export default EmployeeDetailPanel;
