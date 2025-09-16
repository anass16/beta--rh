import React from 'react';
import { CompanyKPIs } from '../../types/pro-analytics';
import { Briefcase, CalendarOff, Clock, AlertTriangle, Star } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

interface AnalyticsHeaderProps {
  kpis: CompanyKPIs;
}

const KPI_Card: React.FC<{ icon: React.ReactNode; label: string; value: string | number; unit?: string }> = ({ icon, label, value, unit }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
    {icon}
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">
        {value} <span className="text-sm font-normal text-gray-600">{unit}</span>
      </p>
    </div>
  </div>
);

const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ kpis }) => {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('pro_analytics_title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPI_Card icon={<Briefcase className="h-8 w-8 text-blue-600" />} label={t('kpi_days_worked')} value={kpis.daysWorked.toFixed(1)} />
            <KPI_Card icon={<CalendarOff className="h-8 w-8 text-red-600" />} label={t('kpi_days_absent')} value={kpis.daysAbsent.toFixed(1)} />
            <KPI_Card icon={<Clock className="h-8 w-8 text-yellow-600" />} label={t('kpi_avg_delay')} value={kpis.avgDelay.toFixed(1)} unit={t('unit_min')} />
            <KPI_Card icon={<AlertTriangle className="h-8 w-8 text-orange-600" />} label={t('kpi_late_days')} value={kpis.lateDays} />
            <KPI_Card icon={<Star className="h-8 w-8 text-green-600" />} label={t('kpi_holidays_worked')} value={kpis.workedHolidays} />
        </div>
    </div>
  );
};

export default AnalyticsHeader;
