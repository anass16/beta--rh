import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: any[][]; // Changed to array of arrays for flexibility
  fileType?: 'attendance' | 'payroll';
}

export const validateFileFormat = (file: File): boolean => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['xls', 'xlsx', 'csv'];
  
  return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension || '');
};

const validateAttendanceStructure = (data: any[][]): boolean => {
  if (!data || data.length === 0) return false;
  
  const headerRow = data[0].map(h => String(h || '').trim());
  
  // Check for SAHAR attendance format: Matricule., Nom., Temps.
  const requiredKeys = ['Matricule.', 'Nom.', 'Temps.'];
  
  const hasRequiredKeys = requiredKeys.every(key => headerRow.includes(key));
  
  return hasRequiredKeys;
};

const validatePayrollStructure = (data: any[][]): boolean => {
  if (!data || data.length < 1) return false;

  let hasHeaderRow = false;

  // Search for header row in the first 10 rows
  const headerKeywords = ['department', 'name', 'summary', 'status', 'département', 'nom', 'résumé', 'statut'];
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i].map(cell => String(cell || '').toLowerCase().trim());
    // A row is likely a header if it contains at least two of the main payroll keywords.
    const foundKeywords = headerKeywords.filter(kw => row.some(cell => cell.includes(kw)));
    if (foundKeywords.length >= 2) { 
      hasHeaderRow = true;
      break;
    }
  }
  
  // A payroll/personnel file is valid if it has the characteristic header row, regardless of period info.
  return hasHeaderRow;
};

export const parseFile = async (file: File): Promise<ValidationResult> => {
  if (!validateFileFormat(file)) {
    return {
      isValid: false,
      error: 'Invalid file format. Only .xls, .xlsx, and .csv files are allowed.'
    };
  }

  try {
    let data: any[][] = [];
    
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
      
      if (parsed.errors && parsed.errors.length > 0) {
        return {
          isValid: false,
          error: `CSV parsing error: ${parsed.errors[0].message}`
        };
      }
      
      data = parsed.data as any[][];
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          isValid: false,
          error: 'Excel file contains no sheets.'
        };
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Use header: 1 to get an array of arrays, which is more robust for weirdly structured files
      data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    }

    if (!data || data.length === 0) {
      return {
        isValid: false,
        error: 'File is empty or contains no valid data.'
      };
    }

    // Remove completely empty rows
    data = data.filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));

    if (data.length === 0) {
      return {
        isValid: false,
        error: 'File contains no valid data rows.'
      };
    }

    // Try to detect file type
    if (validateAttendanceStructure(data)) {
      return {
        isValid: true,
        data,
        fileType: 'attendance'
      };
    }
    
    if (validatePayrollStructure(data)) {
      return {
        isValid: true,
        data,
        fileType: 'payroll'
      };
    }

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    return {
      isValid: false,
      error: `File structure not recognized. Please verify that the uploaded file follows a supported format:

📋 **ATTENDANCE FORMAT (SAHAR)**:
Required columns: Matricule., Nom., Temps.
Optional columns: E/S., E/S calculée., Note., Opération.

📊 **PAYROLL FORMAT**:
- First 2 rows: Period information (date début / date fin)
- Employee data columns: Department, Name, Summary, Status

👥 **PERSONNEL FORMAT**:
- Columns: Department, Name, Summary, Status

**Your file's first row contains**: ${data[0].join(', ')}

Please adjust the file structure to match one of the supported formats.`
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error occurred while processing the file.'}`
    };
  }
};
