import React from 'react';
import { AnalyticsFilters } from '../../types/pro-analytics';
import { Filter, RefreshCw, Search } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

interface FilterBarProps {
  filters: AnalyticsFilters;
  setFilters: React.Dispatch<React.SetStateAction<AnalyticsFilters>>;
  allDepartments: string[];
  onRecompute: () => void;
}

const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, allDepartments, onRecompute }) => {
  const { t } = useI18n();

  const handleDeptChange = (dept: string) => {
    setFilters(prev => {
      const newDepts = prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept];
      return { ...prev, departments: newDepts };
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Filter className="h-5 w-5 text-gray-500" />
        <h3 className="text-md font-semibold text-gray-800">{t('filters')}</h3>
        
        <select
          value={filters.month}
          onChange={e => setFilters(f => ({ ...f, month: parseInt(e.target.value) }))}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        >
          {months.map((name, index) => (
            <option key={index} value={index}>{name}</option>
          ))}
        </select>
        
        <select
          value={filters.year}
          onChange={e => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        >
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>

        <div className="relative">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
              {t('departments')} ({filters.departments.length || t('all_departments')})
            </summary>
            <div className="absolute z-10 mt-2 w-56 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2">
                {allDepartments.map(dept => (
                  <label key={dept} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
                    <input type="checkbox" checked={filters.departments.includes(dept)} onChange={() => handleDeptChange(dept)} className="rounded text-green-600"/>
                    <span className="text-sm">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>

        <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
                type="text"
                placeholder={t('search_placeholder')}
                value={filters.searchText}
                onChange={e => setFilters(f => ({ ...f, searchText: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
            />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={filters.autoDeriveAbsence} onChange={e => setFilters(f => ({...f, autoDeriveAbsence: e.target.checked}))} className="rounded text-green-600" />
          {t('toggle_auto_derive_absence')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={filters.countAbsenceOnHoliday} onChange={e => setFilters(f => ({...f, countAbsenceOnHoliday: e.target.checked}))} className="rounded text-green-600" />
          {t('toggle_count_absence_on_holiday')}
        </label>
        <button onClick={onRecompute} className="ml-auto inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-3 h-3 mr-2" /> {t('recompute_button')}
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
