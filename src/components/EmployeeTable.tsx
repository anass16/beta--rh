import React, { useState, useMemo } from 'react';
import { Search, Download, Eye, Trash2, Users, Pencil } from 'lucide-react';
import { Employee } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
  onExport: (filteredEmployees: Employee[]) => void;
  onRemoveEmployee: (matricule: string) => void;
  onEditEmployee: (employee: Employee) => void;
}

const normalizeString = (str: string) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  employees, 
  onEmployeeClick, 
  onExport,
  onRemoveEmployee,
  onEditEmployee
}) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const departments = useMemo(() => {
    return [...new Set(employees.map(emp => emp.department))].filter(Boolean).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const term = normalizeString(searchTerm);
      const matchesSearch = 
        normalizeString(employee.firstName || '').includes(term) ||
        normalizeString(employee.lastName || '').includes(term) ||
        normalizeString(`${employee.firstName || ''} ${employee.lastName || ''}`).includes(term) ||
        normalizeString(employee.matricule || '').includes(term);
      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, departmentFilter]);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">{t('emp_table_empty_title')}</h3>
        <p className="text-gray-500">{t('emp_table_empty_message')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('search_placeholder_emp')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border rounded-md bg-white"
          >
            <option value="">{t('all_departments')}</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <button onClick={() => onExport(filteredEmployees)} className="inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" /> {t('btn_export')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_col_matricule')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('label_firstname')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('label_lastname')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_col_department')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_col_status')}</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee.matricule} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{employee.matricule}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.firstName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.department}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                  <div className="flex items-center justify-center space-x-3">
                    <button onClick={() => onEmployeeClick(employee)} className="text-green-600 hover:text-green-900" title="View Details"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => onEditEmployee(employee)} className="text-blue-600 hover:text-blue-900" title="Edit Employee"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onRemoveEmployee(employee.matricule)} className="text-red-600 hover:text-red-900" title="Remove Employee"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-gray-500">Showing {filteredEmployees.length} of {employees.length} employees</div>
    </div>
  );
};

export default EmployeeTable;
