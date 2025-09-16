import { Employee, ImportHistory } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'hr_employees_v2', // Version bump to avoid conflicts with old structure
  IMPORT_HISTORY: 'hr_import_history_v2'
};

// Note: Attendance and Payroll are no longer stored separately.
// They are processed and merged into the Employee object directly.

export const saveEmployees = (employees: Employee[]): void => {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
};

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  return data ? JSON.parse(data) : [];
};

export const clearEmployees = (): void => {
  localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
};

export const saveImportHistory = (history: ImportHistory[]): void => {
  localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(history));
};

export const getImportHistory = (): ImportHistory[] => {
  const data = localStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY);
  return data ? JSON.parse(data) : [];
};

export const addImportRecord = (record: ImportHistory): void => {
  const history = getImportHistory();
  history.unshift(record);
  if (history.length > 10) {
    history.splice(10);
  }
  saveImportHistory(history);
};

export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
