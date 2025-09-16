import React from 'react';
import { Employee } from '../types';
import { useProAnalytics } from '../hooks/useProAnalytics';
import AnalyticsHeader from '../components/pro-analytics/AnalyticsHeader';
import FilterBar from '../components/pro-analytics/FilterBar';
import DetailedTable from '../components/pro-analytics/DetailedTable';
import AnalyticsGrid from '../components/pro-analytics/AnalyticsGrid';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface ProAnalyticsPageProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
}

const ProAnalyticsPage: React.FC<ProAnalyticsPageProps> = ({ employees, onEmployeeClick }) => {
  const { filters, setFilters, analyticsData, allDepartments, recompute } = useProAnalytics(employees);
  const { t } = useI18n();

  if (analyticsData.isLoading) {
    return <div className="text-center p-12">{t('loading_message')}</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-gray-400 mb-4">
          <TrendingUp className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">{t('no_data_title')}</h3>
        <p className="text-gray-500">{t('no_data_message')}</p>
      </div>
    );
  }

  const handleRowClick = (matricule: string) => {
    const employee = employees.find(e => e.matricule === matricule);
    if (employee) {
      onEmployeeClick(employee);
    }
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader kpis={analyticsData.companyKpis} />
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        allDepartments={allDepartments}
        onRecompute={recompute}
      />
      <AnalyticsGrid analyticsData={analyticsData} />
      <DetailedTable data={analyticsData.employeeKpis} onRowClick={handleRowClick} />
    </div>
  );
};

export default ProAnalyticsPage;
