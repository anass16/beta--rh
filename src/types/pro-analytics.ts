import { Employee } from './index';

export type DayStatus = 'OnTime' | 'MinorDelay' | 'Late' | 'Absent' | 'Worked' | 'Holiday' | 'WorkedOnHoliday' | 'Weekend';

export interface Absence {
  id: string; // UUID
  matricule: string;
  date: string; // YYYY-MM-DD
  reasonCode: string; // e.g., ABSENT, SICK, LEAVE
  source: 'FILE' | 'MANUAL';
  note?: string;
  uploadId?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export type DayRollup = { 
  matricule: string; 
  date: string; 
  hours: number; 
  firstIn?: string; 
  delayMin?: number; 
  isHoliday: boolean; 
  workedHoliday: boolean; 
  credit: 0|0.5|1;
  isAbsentFromFile: boolean;
  absenceInfo?: Absence;
  punches: any[];
  status: DayStatus;
};

export type MonthlyKPI = { 
  matricule: string; 
  month: string; 
  daysWorked: number; 
  daysAbsent: number; 
  deltaDays: number; 
  totalHours: number; 
  avgDelayMin: number; 
  lateDays: number; 
  minorDays: number; 
  onTimeDays: number;
  workedHolidays: number;
  name: string;
  department: string;
  status: 'Active' | 'Inactive';
};

export interface Holiday {
  name: string;
  type: 'fixed' | 'religious';
}

export interface ScheduleTime {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface ScheduleDetails {
  morning: ScheduleTime | null;
  afternoon: ScheduleTime | null;
  worksSaturday: boolean;
}

export interface ScheduleConfig {
  company_default: ScheduleDetails;
  department_defaults: { [department: string]: Partial<ScheduleDetails> };
  employee_overrides: { [matricule: string]: Partial<ScheduleDetails> };
}

export interface LatenessPolicy {
  graceMinutes: number;
  minorDelayMinutes: number;
  halfDayThresholdHours: number;
  requiredDaysPerMonth: number;
}

export interface AnalyticsFilters {
  month: number; // 0-11
  year: number;
  departments: string[];
  status: ('Active' | 'Inactive')[];
  searchText: string;
  autoDeriveAbsence: boolean;
  countAbsenceOnHoliday: boolean;
}

export interface CompanyKPIs {
  daysWorked: number;
  daysAbsent: number;
  avgDelay: number;
  lateDays: number;
  workedHolidays: number;
  onTimeRate: number;
}

export interface DepartmentKPI extends Omit<CompanyKPIs, 'onTimeRate'> {
  department: string;
}

export interface AnalyticsData {
  companyKpis: CompanyKPIs;
  departmentKpis: DepartmentKPI[];
  employeeKpis: MonthlyKPI[];
  dailyMetrics: { date: string; avgDelay: number }[];
  isLoading: boolean;
  sourceEmployees: Employee[];
}

// Types for Daily Alerts
export type AlertType = 'LATE' | 'MINOR' | 'ABSENT' | 'HOLIDAY_WORKED' | 'HOLIDAY_NO_ATT';

export interface AlertItem {
  matricule: string;
  name: string;
  department: string;
  delayMin?: number;
  hours?: number;
  reasonTag: AlertType;
  note?: string;
}

export interface AlertGroup {
  key: string; // e.g., Department name
  totals: Record<Lowercase<AlertType>, number>;
  items: AlertItem[];
}

export interface DailyAlertsData {
  date: string;
  groups: AlertGroup[];
  unmatchedCount: number;
  totalAlerts: number;
}
