export interface AttendanceRecord {
  employeeId: string; // This will be the Matricule
  employeeName: string;
  department?: string;
  punchDateTime: string;
  punchType: 'IN' | 'OUT';
  note?: string;
  operation?: string;
  // Fields from file for pro analytics
  rawDate?: string;
  rawTime?: string;
  rawHours?: number;
  rawAbsence?: string;
  rawLateness?: number;
}

export interface PayrollRecord {
  matricule: string;
  firstName: string;
  lastName: string;
  department: string;
  daysWorked: number;
  daysOff: number;
  totalDays: number;
  status: string;
  periodStart: string;
  periodEnd: string;
}

export interface Employee {
  matricule: string;
  firstName: string;
  lastName: string;
  department: string;
  daysWorked: number;
  daysOff: number;
  totalDays: number;
  status: string;
  period: string;
  attendanceRecords: AttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadSummary {
  inserted: number;
  updated: number;
  skipped: number; // For conflicts
  errors: number;
  quarantined: number; // For rows missing matricule
  fileDuplicates: number; // For matricules duplicated within the same file
  errorMessages: string[];
  // Attendance-specific
  matchedRows?: number;
  unmatchedRows?: number;
  absentRowsFromFile?: number;
  recomputeMs?: number;
}

export interface ImportHistory {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  summary: UploadSummary;
}

export interface Analytics {
  totalEmployees: number;
  attendanceRate: number;
  avgLateMinutes: number;
  totalAbsences: number;
  departmentPerformance: Array<{
    department: string;
    employees: number;
    daysWorked: number;
    absences: number;
    attendanceRate: number;
  }>;
}

export interface CorrectionReport {
  detected_format: 'attendance' | 'payroll' | 'personnel' | 'unknown';
  header_row_index: number;
  mappings: {
    original_index: number;
    original_header: string;
    mapped_to: string;
    confidence: number;
  }[];
  dropped_rows: number;
  warnings: string[];
  period?: { start?: string; end?: string };
}
