import { Employee, UploadSummary, AttendanceRecord } from '../types';
import { calculateNameSimilarity } from './stringSimilarity';
import { importAbsencesFromFile } from '../services/absenceManager';

type UpsertResult = {
  employees: Employee[];
  summary: Omit<UploadSummary, 'errors' | 'errorMessages' | 'quarantined'>;
  conflicts: any[][];
};

const normalizeMatricule = (v: any): string => {
    if (v === null || v === undefined) return '';
    return String(v).trim().replace(/\u200B|\u200E|\u200F/g, "");
};

const mergeField = (existingValue: any, incomingValue: any): any => {
    const incomingTrimmed = typeof incomingValue === 'string' ? incomingValue.trim() : incomingValue;
    if (incomingTrimmed !== null && incomingTrimmed !== undefined && incomingTrimmed !== '') {
        return incomingTrimmed;
    }
    return existingValue;
};

export const upsertEmployeeData = (
  existingEmployees: Employee[],
  recordsFromFile: Record<string, any>[],
  period: { start?: string; end?: string }
): UpsertResult => {
  const summary: UpsertResult['summary'] = {
    inserted: 0, updated: 0, skipped: 0, fileDuplicates: 0,
  };
  const conflicts: any[][] = [['Matricule', 'Existing Name', 'Incoming Name', 'Reason']];
  const employeeMap = new Map<string, Employee>(
    existingEmployees.map(emp => [normalizeMatricule(emp.matricule), JSON.parse(JSON.stringify(emp))])
  );
  const now = new Date().toISOString();

  const fileRecordMap = new Map<string, Record<string, any>>();
  recordsFromFile.forEach(record => {
    const matricule = normalizeMatricule(record['Matricule.']);
    if (!matricule) return;

    const existingInFile = fileRecordMap.get(matricule);
    if (existingInFile) {
      summary.fileDuplicates++;
      const incomingFullName = `${record.FirstName || ''} ${record.LastName || ''}`.trim();
      const existingFullName = `${existingInFile.FirstName || ''} ${existingInFile.LastName || ''}`.trim();
      if (incomingFullName.length > existingFullName.length) {
        existingInFile.FirstName = record.FirstName;
        existingInFile.LastName = record.LastName;
      }
      existingInFile.Department = mergeField(existingInFile.Department, record.Department);
      const mergedStatus = mergeField(existingInFile.Status, record.Status);
      existingInFile.Status = (mergedStatus === 'Active' || existingInFile.Status === 'Active') ? 'Active' : mergedStatus;
      if(record.Summary) existingInFile.Summary = record.Summary;
    } else {
      fileRecordMap.set(matricule, record);
    }
  });

  fileRecordMap.forEach((record, matricule) => {
    const existingEmployee = employeeMap.get(matricule);
    const incomingFirstName = String(record.FirstName || '');
    const incomingLastName = String(record.LastName || '');
    const incomingFullName = `${incomingFirstName} ${incomingLastName}`.trim();
    
    if (existingEmployee && incomingFullName) {
      const existingFullName = `${existingEmployee.firstName} ${existingEmployee.lastName}`.trim();
      if (calculateNameSimilarity(existingFullName, incomingFullName) < 0.5) {
        conflicts.push([matricule, existingFullName, incomingFullName, 'Name similarity too low']);
        summary.skipped++;
        return;
      }
    }

    const summaryStr = String(record.Summary || '');
    let daysWorked = 0, daysOff = 0, totalDays = 0;
    if (summaryStr) {
      const parts = summaryStr.split(',').map(s => parseInt(s.replace(/[^\d]/g, ''), 10) || 0);
      if (parts.length >= 4) {
        [daysWorked, daysOff, , totalDays] = [parts[0], parts[1] + parts[2], parts[3]];
      } else if (parts.length > 0) {
        daysWorked = parts[0];
      }
    }
    totalDays = totalDays || (daysWorked + daysOff);

    if (existingEmployee) {
      summary.updated++;
      const existingFullName = `${existingEmployee.firstName} ${existingEmployee.lastName}`.trim();
      if (incomingFullName.length > existingFullName.length) {
        existingEmployee.firstName = incomingFirstName;
        existingEmployee.lastName = incomingLastName;
      }
      existingEmployee.department = mergeField(existingEmployee.department, record.Department);
      const mergedStatus = mergeField(existingEmployee.status, record.Status);
      existingEmployee.status = (mergedStatus === 'Active' || existingEmployee.status === 'Active') ? 'Active' : mergedStatus;
      existingEmployee.daysWorked += daysWorked;
      existingEmployee.daysOff += daysOff;
      existingEmployee.totalDays += totalDays;
      if (period.start && period.end) {
        existingEmployee.period = `${period.start} - ${period.end}`;
      }
      existingEmployee.updatedAt = now;
    } else {
      summary.inserted++;
      const newEmployee: Employee = {
        matricule,
        firstName: incomingFirstName,
        lastName: incomingLastName,
        department: String(record.Department || 'N/A').trim(),
        status: String(record.Status || 'Active').trim(),
        daysWorked,
        daysOff,
        totalDays,
        period: period.start && period.end ? `${period.start} - ${period.end}` : 'N/A',
        attendanceRecords: [],
        createdAt: now,
        updatedAt: now,
      };
      employeeMap.set(matricule, newEmployee);
    }
  });

  return {
    employees: Array.from(employeeMap.values()).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)),
    summary,
    conflicts,
  };
};

export const linkAttendanceData = (
  existingEmployees: Employee[],
  attendanceRecordsFromFile: Record<string, any>[],
  uploadId: string
): {
  employees: Employee[];
  summary: { matchedRows: number; unmatchedRows: number; absentRowsFromFile: number };
  unmatchedRows: any[][];
} => {
  const summary = { matchedRows: 0, unmatchedRows: 0, absentRowsFromFile: 0 };
  const unmatchedRows: any[][] = [['Matricule', 'Name', 'Date', 'Reason']];
  const employeeMap = new Map<string, Employee>(
    existingEmployees.map(emp => [normalizeMatricule(emp.matricule), JSON.parse(JSON.stringify(emp))])
  );

  // This function now handles both attendance punches and absence records from the file.
  const absenceReport = importAbsencesFromFile(attendanceRecordsFromFile, uploadId);
  summary.absentRowsFromFile = absenceReport.imported;

  attendanceRecordsFromFile.forEach(record => {
    const matricule = normalizeMatricule(record['Matricule.']);
    if (!matricule) return;

    const employee = employeeMap.get(matricule);

    if (employee) {
      summary.matchedRows++;
      
      const rawDate = record['Date']; // Should be YYYY-MM-DD
      const rawTime = record['Punch']; // Should be HH:mm or HH:mm:ss

      let combinedDateTime: string;
      if (rawDate && rawTime && /^\d{2}:\d{2}/.test(String(rawTime))) {
          // We have both date and time, create a full ISO-like string
          combinedDateTime = `${rawDate}T${rawTime}`;
      } else if (rawDate) {
          // Only have a date, use it. This might be a record with only hours, not specific punches.
          // The analytics engine will use the rawHours if available.
          combinedDateTime = rawDate;
      } else {
          // Fallback, should not happen for matched rows
          combinedDateTime = new Date().toISOString();
      }
      
      const newAttendanceRecord: AttendanceRecord = {
        employeeId: employee.matricule,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        punchDateTime: combinedDateTime,
        punchType: String(record['Punch'] || '').toUpperCase().includes('OUT') ? 'OUT' : 'IN',
        note: String(record['Note.'] || ''),
        operation: String(record['Opération.'] || ''),
        rawDate: record['Date'],
        rawTime: record['Punch'],
        rawHours: record['Hours'],
        rawAbsence: record['Absence'],
        rawLateness: record['Lateness'],
      };

      if (!employee.attendanceRecords) {
        employee.attendanceRecords = [];
      }
      // Filter out pure absence markers from becoming punch records
      if (newAttendanceRecord.rawAbsence && !newAttendanceRecord.rawTime && !newAttendanceRecord.rawHours) {
        return;
      }
      employee.attendanceRecords.push(newAttendanceRecord);
      employee.updatedAt = new Date().toISOString();

    } else {
      summary.unmatchedRows++;
      unmatchedRows.push([
        record['Matricule.'],
        record['Name'] || '',
        record['Date'] || '',
        'No employee found with this Matricule'
      ]);
    }
  });

  return {
    employees: Array.from(employeeMap.values()),
    summary,
    unmatchedRows,
  };
};
