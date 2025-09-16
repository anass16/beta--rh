import { CorrectionReport } from '../types';
import { toZonedTime, format as formatDateFns } from 'date-fns-tz';

const TIMEZONE = 'Africa/Casablanca';

const SHARED_HEADERS: { [key: string]: string[] } = {
  'Matricule.': ['matricule', 'matricule.', 'id', 'code'],
  'Name': ['name', 'nom', 'nom.', 'full name', 'names', 'personnel', 'first name', 'last name'],
  'FirstName': ['first name', 'firstname', 'prénom', 'prenom'],
  'LastName': ['last name', 'lastname', 'nom de famille'],
  'Department': ['department', 'departement', 'département', 'service', 'dept'],
  'Summary': ['summary', 'résumé', 'synthèse', 'synthese'],
  'Status': ['status', 'statut'],
};

const ATTENDANCE_HEADERS: { [key: string]: string[] } = {
  ...SHARED_HEADERS,
  'Date': ['date', 'jour', 'day'],
  'Punch': ['e/s', 'e/s.', 'in/out', 'punch type', 'type', 'entré', 'sortie', 'punch in/out'],
  'Hours': ['temps', 'heures', 'hours', 'durée', 'duration', 'temps.'],
  'Absence': ['absence', 'absent', 'etat', 'status_abs', 'code_abs'],
  'Lateness': ['retard', 'delay_min', 'late_min'],
  'Note.': ['note', 'note.', 'notes', 'remark', 'remarque'],
  'Opération.': ['opération', 'opération.', 'operation'],
};

const PERIOD_KEYS = {
    start: ['date de début', 'date début', 'start date'],
    end: ['date de fin', 'end date']
};

const normalizeMatricule = (v: any): string => {
    if (v === null || v === undefined) return '';
    return String(v).trim().replace(/\u200B|\u200E|\u200F/g, "");
};

function excelSerialDateToYMD(serial: number): string | null {
    if (typeof serial !== 'number' || serial < 1) return null;
    // Excel's epoch starts on 1899-12-30 for compatibility with Lotus 1-2-3's leap year bug
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + serial * 86400 * 1000);
    // Format the date in the target timezone to get the correct YYYY-MM-DD
    return formatDateFns(date, 'yyyy-MM-dd', { timeZone: TIMEZONE });
}

function normalizeDateValue(value: any): string {
    if (value === null || value === undefined || value === '') return '';
    
    // If it's a number, it's likely an Excel serial date
    if (typeof value === 'number') {
        const ymd = excelSerialDateToYMD(value);
        if (ymd) return ymd;
    }

    const strValue = String(value).trim();
    
    // Attempt to parse various string formats
    try {
        // Handles 'YYYY-MM-DD', 'MM/DD/YYYY', etc.
        const date = new Date(strValue);
        if (!isNaN(date.getTime())) {
            // Convert to the target timezone before formatting to avoid off-by-one day errors
            const zonedDate = toZonedTime(date, TIMEZONE);
            return formatDateFns(zonedDate, 'yyyy-MM-dd');
        }
    } catch (e) {
        // Ignore parsing errors and return original string
    }

    return strValue; // Fallback to original string if parsing fails
}

function findHeaderMapping(header: string, availableHeaders: { [key: string]: string[] }): { mapped: string; confidence: number } | null {
  const lowerHeader = String(header || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
  if (!lowerHeader) return null;

  for (const standardHeader in availableHeaders) {
    const synonyms = availableHeaders[standardHeader];
    if (synonyms.includes(lowerHeader)) {
      return { mapped: standardHeader, confidence: 1.0 };
    }
  }
  return null;
}

function findHeaderRowIndex(data: any[][]): number {
  let bestIndex = -1;
  let maxScore = 0;

  const allKeywords = [...Object.values(ATTENDANCE_HEADERS).flat()];
  
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach(cell => {
      const sCell = String(cell || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (allKeywords.includes(sCell)) score++;
    });

    const hasMatricule = row.some(c => findHeaderMapping(String(c), { 'Matricule.': SHARED_HEADERS['Matricule.'] }));
    const hasNameOrDate = row.some(c => findHeaderMapping(String(c), { 'Name': SHARED_HEADERS['Name'], 'Date': ATTENDANCE_HEADERS['Date'] }));

    if (score > maxScore && hasMatricule && hasNameOrDate) {
      maxScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function detectPeriod(data: any[][], headerRowIndex: number): { start?: string; end?: string } {
    const period = { start: undefined, end: undefined };
    const scanLimit = headerRowIndex !== -1 ? headerRowIndex : Math.min(data.length, 5);

    for (let i = 0; i < scanLimit; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            const nextCell = row[j + 1];

            if (PERIOD_KEYS.start.includes(cell) && nextCell) {
                period.start = normalizeDateValue(nextCell);
            }
            if (PERIOD_KEYS.end.includes(cell) && nextCell) {
                period.end = normalizeDateValue(nextCell);
            }
        }
    }
    return period;
}

function detectFormat(mappedHeaders: string[], period: { start?: string; end?: string }): CorrectionReport['detected_format'] {
    const has = (key: string) => mappedHeaders.includes(key);

    if (has('Matricule.') && (has('Date') || has('Punch') || has('Hours'))) return 'attendance';
    if (has('Matricule.') && has('Department') && (period.start || period.end)) return 'payroll';
    if (has('Matricule.') && has('Department')) return 'personnel';
    return 'unknown';
}

export function analyzeAndCorrectFile(rawData: any[][]): { 
  report: CorrectionReport; 
  standardizedRecords: Record<string, any>[]; 
  quarantinedRows: any[][];
} {
  const report: CorrectionReport = {
    detected_format: 'unknown', header_row_index: -1, mappings: [],
    dropped_rows: 0, warnings: [], period: {},
  };
  
  if (!Array.isArray(rawData) || rawData.length === 0) {
    report.warnings.push('File is empty or not a valid array.');
    return { report, standardizedRecords: [], quarantinedRows: [] };
  }

  const cleanedData = rawData.filter(row => Array.isArray(row) && row.some(cell => String(cell || '').trim() !== ''));
  report.dropped_rows = rawData.length - cleanedData.length;

  if (cleanedData.length === 0) {
    report.warnings.push('File contains no data after removing empty rows.');
    return { report, standardizedRecords: [], quarantinedRows: [] };
  }

  report.header_row_index = findHeaderRowIndex(cleanedData);
  report.period = detectPeriod(cleanedData, report.header_row_index);

  if (report.header_row_index === -1) {
    report.warnings.push('Could not find a valid header row containing a "Matricule" column. All rows quarantined.');
    return { report, standardizedRecords: [], quarantinedRows: cleanedData };
  }

  const originalHeaders = cleanedData[report.header_row_index].map(c => String(c || ''));
  const dataRows = cleanedData.slice(report.header_row_index + 1);
  
  const schema = ATTENDANCE_HEADERS;
  const indexToStandardHeader: { [key: number]: string } = {};
  const mappedStandardHeaders: string[] = [];

  originalHeaders.forEach((h, i) => {
      const mapping = findHeaderMapping(h, schema);
      if (mapping) {
        if (!mappedStandardHeaders.includes(mapping.mapped)) {
          indexToStandardHeader[i] = mapping.mapped;
          mappedStandardHeaders.push(mapping.mapped);
        }
        report.mappings.push({ original_index: i, original_header: h, mapped_to: mapping.mapped, confidence: mapping.confidence });
      }
  });

  report.detected_format = detectFormat(mappedStandardHeaders, report.period);

  if (!mappedStandardHeaders.includes('Matricule.')) {
    report.warnings.push('File format is missing a required "Matricule" column. All data rows quarantined.');
    return { report, standardizedRecords: [], quarantinedRows: [originalHeaders, ...dataRows] };
  }
  
  const matriculeOriginalIndex = Object.entries(indexToStandardHeader).find(([,v]) => v === 'Matricule.')?.[0];
  if (matriculeOriginalIndex === undefined) {
      report.warnings.push('Internal error: Could not find Matricule index after mapping. All rows quarantined.');
      return { report, standardizedRecords: [], quarantinedRows: [originalHeaders, ...dataRows] };
  }

  const standardizedRecords: Record<string, any>[] = [];
  const quarantinedRows: any[][] = [];

  const nameMapped = mappedStandardHeaders.includes('Name');
  const firstNameMapped = mappedStandardHeaders.includes('FirstName');
  const lastNameMapped = mappedStandardHeaders.includes('LastName');

  dataRows.forEach(row => {
    const matricule = normalizeMatricule(row[parseInt(matriculeOriginalIndex)]);
    if (!matricule) {
      quarantinedRows.push(row);
    } else {
      const record: Record<string, any> = {};
      
      Object.entries(indexToStandardHeader).forEach(([index, standardHeader]) => {
        let val = row[parseInt(index)];
        if (standardHeader === 'Date') {
            val = normalizeDateValue(val);
        }
        record[standardHeader] = (standardHeader === 'Matricule.') ? matricule : val;
      });

      if (!firstNameMapped && !lastNameMapped && nameMapped) {
        const fullName = String(record['Name'] || '').trim();
        const parts = fullName.split(/\s+/);
        record['LastName'] = parts.pop() || '';
        record['FirstName'] = parts.join(' ');
      }
      
      // Rename legacy `Temps.` to `Punch` if it contains time-like data
      if (record['Temps.'] && !record['Punch']) {
        record['Punch'] = record['Temps.'];
        delete record['Temps.'];
      }

      delete record['Name'];

      standardizedRecords.push(record);
    }
  });

  if (quarantinedRows.length > 0) {
    report.warnings.push(`${quarantinedRows.length} rows were quarantined due to missing Matricule.`);
  }

  return { report, standardizedRecords, quarantinedRows };
}
