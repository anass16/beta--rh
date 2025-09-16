import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Users, BarChart3, Database, Wrench, UserPlus, Trash2, AreaChart, Languages } from 'lucide-react';
import FileUpload from './components/FileUpload';
import EmployeeTable from './components/EmployeeTable';
import EmployeeDetailPanel from './components/EmployeeDetailPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import EmployeeFormModal from './components/EmployeeFormModal';
import FileCorrector from './components/FileCorrector';
import ProAnalyticsPage from './pages/ProAnalyticsPage';
import { Employee, ImportHistory, UploadSummary } from './types';
import { upsertEmployeeData, linkAttendanceData } from './utils/dataProcessor';
import { saveEmployees, getEmployees, addImportRecord, getImportHistory, clearEmployees } from './utils/storage';
import { analyzeAndCorrectFile } from './utils/fileCorrector';
import { downloadCSV } from './utils/csvDownloader';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useI18n } from './contexts/I18nContext';
import AlertsHeaderIcon from './components/alerts/AlertsHeaderIcon';
import { invalidateCache } from './services/absenceManager';

type ActiveView = 'upload' | 'employees' | 'analytics' | 'corrector' | 'pro-analytics';

function App() {
  const { t, language, setLanguage } = useI18n();
  const [activeView, setActiveView] = useState<ActiveView>('pro-analytics');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [lastUploadReports, setLastUploadReports] = useState<{ suggestions?: any[][], conflicts?: any[][], unmatched_attendance?: any[][] }>({});
  
  const forceUIRefresh = useCallback(() => {
    // This key change will force hooks that depend on it to re-run
    invalidateCache(); // This will bump the version, forcing caches to invalidate
    setEmployees(getEmployees()); // Re-fetch from primary storage
  }, []);


  useEffect(() => {
    setEmployees(getEmployees());
    setImportHistory(getImportHistory());
  }, []);

  const handleFileProcessed = async (file: File) => {
    setLastUploadReports({});
    let rawData: any[][] = [];
    const startTime = performance.now();
    const uploadId = `upload_${Date.now()}`;

    try {
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const result = Papa.parse(text, { header: false, skipEmptyLines: true });
        if (result.errors.length) throw new Error(`CSV parsing error: ${result.errors[0].message}`);
        rawData = result.data as any[][];
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error('Excel file has no sheets.');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) || [];
      }

      if (!Array.isArray(rawData)) {
        throw new Error("Parsed file data is not a valid array of rows. The file might be corrupt or in an unsupported format.");
      }

      const { report, standardizedRecords, quarantinedRows } = analyzeAndCorrectFile(rawData);
      
      let finalSummary: UploadSummary;
      let updatedEmployees: Employee[];
      const reportsToSave: { suggestions?: any[][], conflicts?: any[][], unmatched_attendance?: any[][] } = {};

      if (report.detected_format === 'attendance') {
        const { employees: linkedEmployees, summary: linkSummary, unmatchedRows } = linkAttendanceData(
            getEmployees(),
            standardizedRecords,
            uploadId
        );
        updatedEmployees = linkedEmployees;
        finalSummary = {
            inserted: 0, updated: 0, skipped: 0, errors: 0, fileDuplicates: 0,
            quarantined: quarantinedRows.length,
            matchedRows: linkSummary.matchedRows,
            unmatchedRows: linkSummary.unmatchedRows,
            errorMessages: report.warnings,
            absentRowsFromFile: linkSummary.absentRowsFromFile,
        };
        if (unmatchedRows.length > 1) {
            reportsToSave.unmatched_attendance = unmatchedRows;
        }
      } else { // Payroll or Personnel
        const { employees: upsertedEmployees, summary: upsertSummary, conflicts } = upsertEmployeeData(
            getEmployees(),
            standardizedRecords,
            report.period || {}
        );
        updatedEmployees = upsertedEmployees;
        finalSummary = {
            ...upsertSummary,
            errors: 0,
            quarantined: quarantinedRows.length,
            errorMessages: report.warnings,
            skipped: conflicts.length > 1 ? conflicts.length - 1 : 0
        };
        if (conflicts.length > 1) {
            reportsToSave.conflicts = conflicts;
        }
      }

      saveEmployees(updatedEmployees);

      const endTime = performance.now();
      const importRecord: ImportHistory = {
        id: uploadId,
        fileName: file.name,
        fileType: report.detected_format || 'unknown',
        uploadDate: new Date().toISOString(),
        summary: {...finalSummary, recomputeMs: Math.round(endTime - startTime) }
      };
      
      addImportRecord(importRecord);
      setImportHistory(getImportHistory());

      if (quarantinedRows.length > 0) {
        const suggestions = [['Quarantined Row Data', 'Suggested Matricule', 'Suggested Name']];
        quarantinedRows.forEach(row => suggestions.push([row.join(' | ')]));
        reportsToSave.suggestions = suggestions;
      }
      setLastUploadReports(reportsToSave);
      forceUIRefresh();

    } catch (error) {
       throw error;
    }
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailPanelOpen(true);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormModalOpen(true);
  };

  const handleSaveEmployee = (userData: { matricule: string; firstName: string; lastName: string; department: string; status: string }) => {
    const now = new Date().toISOString();
    let updatedEmployees: Employee[];

    if (editingEmployee) { // Update mode
      updatedEmployees = employees.map(emp => {
        if (emp.matricule === editingEmployee.matricule) {
          return { ...emp, ...userData, updatedAt: now };
        }
        return emp;
      });
    } else { // Create mode
      if (employees.some(emp => emp.matricule === userData.matricule)) {
        alert(t('error_matricule_exists'));
        return;
      }
      const newEmployee: Employee = {
        ...userData,
        daysWorked: 0, daysOff: 0, totalDays: 0,
        period: 'N/A', attendanceRecords: [],
        createdAt: now, updatedAt: now,
      };
      updatedEmployees = [...employees, newEmployee];
    }
    
    const sortedEmployees = updatedEmployees.sort((a, b) => 
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );
    setEmployees(sortedEmployees);
    saveEmployees(sortedEmployees);
    setIsFormModalOpen(false);
    setEditingEmployee(null);
  };

  const handleRemoveUser = (matricule: string) => {
    if (window.confirm(t('confirm_delete_employee_msg'))) {
      const updatedEmployees = employees.filter(emp => emp.matricule !== matricule);
      setEmployees(updatedEmployees);
      saveEmployees(updatedEmployees);
    }
  };

  const handleDeleteAllEmployees = () => {
    if (window.confirm(t('confirm_delete_all_employees_msg'))) {
      setEmployees([]);
      clearEmployees();
      invalidateCache(); // Also clear absence data
    }
  };

  const handleExportEmployees = (employeesToExport: Employee[]) => {
    const csvData = [
      ['Matricule', 'First Name', 'Last Name', 'Department', 'Days Worked', 'Days Off', 'Total Days', 'Status', 'Period'],
      ...employeesToExport.map(emp => [
        emp.matricule, emp.firstName, emp.lastName, emp.department,
        emp.daysWorked, emp.daysOff, emp.totalDays,
        emp.status, emp.period
      ])
    ];
    downloadCSV(csvData, `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const departments = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">HR Attendance Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <AlertsHeaderIcon employees={employees} onEmployeeClick={handleEmployeeClick} />
              <div className="w-px h-6 bg-gray-200" />
              <Languages className="h-5 w-5 text-gray-500" />
              <button onClick={() => setLanguage('fr')} className={`px-3 py-1 rounded-md text-sm font-medium ${language === 'fr' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>FR</button>
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-sm font-medium ${language === 'en' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button onClick={() => setActiveView('upload')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'upload' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Upload className="w-4 h-4" /> <span>{t('nav_upload')}</span>
            </button>
            <button onClick={() => setActiveView('employees')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'employees' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Users className="w-4 h-4" /> <span>{t('nav_employees')}</span>
            </button>
            <button onClick={() => setActiveView('analytics')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'analytics' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <BarChart3 className="w-4 h-4" /> <span>{t('nav_analytics')}</span>
            </button>
             <button onClick={() => setActiveView('pro-analytics')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'pro-analytics' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <AreaChart className="w-4 h-4" /> <span>{t('nav_pro_analytics')}</span>
            </button>
            <button onClick={() => setActiveView('corrector')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'corrector' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Wrench className="w-4 h-4" /> <span>{t('nav_corrector')}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <FileUpload onFileProcessed={handleFileProcessed} lastUploadReports={lastUploadReports} />
            </div>
            {importHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-medium text-gray-900">{t('history_title')}</h3></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_file')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_type')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_matched')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_unmatched')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_absences')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_quarantined')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('history_col_time')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importHistory.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.fileName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.fileType}</td>
                          <td className="px-6 py-4 text-sm text-green-600">{record.summary.matchedRows ?? '-'}</td>
                          <td className="px-6 py-4 text-sm text-red-600">{record.summary.unmatchedRows ?? '-'}</td>
                          <td className="px-6 py-4 text-sm text-blue-600">{record.summary.absentRowsFromFile ?? '-'}</td>
                          <td className="px-6 py-4 text-sm text-yellow-600">{record.summary.quarantined}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{record.summary.recomputeMs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'employees' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-xl font-semibold text-gray-900">{t('emp_page_title')}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={openAddModal} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" /> {t('btn_add_employee')}
                  </button>
                  <button onClick={handleDeleteAllEmployees} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-4 h-4 mr-2" /> {t('btn_delete_all')}
                  </button>
                </div>
              </div>
              <EmployeeTable employees={employees} onEmployeeClick={handleEmployeeClick} onExport={handleExportEmployees} onRemoveEmployee={handleRemoveUser} onEditEmployee={openEditModal} />
            </div>
          </div>
        )}

        {activeView === 'analytics' && <AnalyticsDashboard employees={employees} />}
        {activeView === 'pro-analytics' && <ProAnalyticsPage employees={employees} onEmployeeClick={handleEmployeeClick} />}
        {activeView === 'corrector' && <FileCorrector />}
      </main>

      <EmployeeDetailPanel 
        employee={selectedEmployee} 
        isOpen={isDetailPanelOpen} 
        onClose={() => setIsDetailPanelOpen(false)} 
        onDataChanged={forceUIRefresh}
      />
      <EmployeeFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        onSave={handleSaveEmployee} 
        initialData={editingEmployee}
        existingDepartments={departments} 
        existingMatricules={employees.map(e => e.matricule)} 
      />
    </div>
  );
}

export default App;
