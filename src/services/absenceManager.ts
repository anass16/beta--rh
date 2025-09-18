import { Absence } from '../types/pro-analytics';
import { isHoliday } from '../utils/holidayManager';
import { getCustomAbsenceTypes } from './absenceTypeManager';

const ABSENCE_VERSION_KEY = 'hr_absence_version';
const ABSENCE_DATA_KEY_PREFIX = 'hr_absences';

// Use BroadcastChannel for reliable cross-component communication on data changes.
const channel = new BroadcastChannel('absences-update');

const STATIC_ABSENCE_REASON_MAP: { [key: string]: string } = {
  // Unjustified Absence
  "A": "UNJUSTIFIED_ABSENCE", "ABS": "UNJUSTIFIED_ABSENCE", "ABSENT": "UNJUSTIFIED_ABSENCE",
  "1": "UNJUSTIFIED_ABSENCE", "AN": "UNJUSTIFIED_ABSENCE", "ABSENCE INJUSTIFIÉE": "UNJUSTIFIED_ABSENCE",
  "UNJUSTIFIED ABSENCE": "UNJUSTIFIED_ABSENCE", "UNJUSTIFIED_ABSENCE": "UNJUSTIFIED_ABSENCE",
  // Sick Leave
  "SICK": "SICK_LEAVE", "MALADIE": "SICK_LEAVE", "CONGÉ MALADIE": "SICK_LEAVE",
  "SICK LEAVE": "SICK_LEAVE", "SICK_LEAVE": "SICK_LEAVE",
  // Annual Leave / Paid Leave
  "LEAVE": "ANNUAL_LEAVE", "CONGÉ PAYÉ": "ANNUAL_LEAVE", "CONGE PAYE": "ANNUAL_LEAVE",
  "PAID LEAVE": "ANNUAL_LEAVE", "ANNUAL LEAVE": "ANNUAL_LEAVE", "CONGÉ ANNUEL": "ANNUAL_LEAVE",
  "ANNUAL_LEAVE": "ANNUAL_LEAVE",
  // Unpaid Leave
  "UNPAID": "UNPAID_LEAVE", "CONGÉ SANS SOLDE": "UNPAID_LEAVE", "UNPAID LEAVE": "UNPAID_LEAVE",
  "UNPAID_LEAVE": "UNPAID_LEAVE",
  // Exceptional Leave
  "CONGÉ EXCEPTIONNEL": "EXCEPTIONAL_LEAVE", "EXCEPTIONAL LEAVE": "EXCEPTIONAL_LEAVE",
  "EXCEPTIONAL_LEAVE": "EXCEPTIONAL_LEAVE",
  // Maternity/Paternity Leave
  "CONGÉ MATERNITÉ": "MATERNITY_PATERNITY_LEAVE", "CONGÉ PATERNITÉ": "MATERNITY_PATERNITY_LEAVE",
  "MATERNITY LEAVE": "MATERNITY_PATERNITY_LEAVE", "PATERNITY LEAVE": "MATERNITY_PATERNITY_LEAVE",
  "MATERNITY_PATERNITY_LEAVE": "MATERNITY_PATERNITY_LEAVE",
  // Parental Leave
  "CONGÉ PARENTAL": "PARENTAL_LEAVE", "PARENTAL LEAVE": "PARENTAL_LEAVE", "PARENTAL_LEAVE": "PARENTAL_LEAVE",
  // Work Accident
  "ACCIDENT DE TRAVAIL": "WORK_ACCIDENT", "WORK ACCIDENT": "WORK_ACCIDENT", "WORK_ACCIDENT": "WORK_ACCIDENT",
  // Unjustified Lateness
  "RETARD NON JUSTIFIÉ": "UNJUSTIFIED_LATENESS", "UNJUSTIFIED LATENESS": "UNJUSTIFIED_LATENESS",
  "UNJUSTIFIED_LATENESS": "UNJUSTIFIED_LATENESS",
  // Unjustified Early Departure
  "DÉPART ANTICIPé": "UNJUSTIFIED_EARLY_DEPARTURE", "DEPART ANTICIPE": "UNJUSTIFIED_EARLY_DEPARTURE",
  "EARLY DEPARTURE": "UNJUSTIFIED_EARLY_DEPARTURE", "UNJUSTIFIED_EARLY_DEPARTURE": "UNJUSTIFIED_EARLY_DEPARTURE",
  // Professional Mission
  "MISSION": "PROFESSIONAL_MISSION", "MISSION PROFESSIONNELLE": "PROFESSIONAL_MISSION",
  "PROFESSIONAL MISSION": "PROFESSIONAL_MISSION", "PROFESSIONAL_MISSION": "PROFESSIONAL_MISSION",
  // Training
  "FORMATION": "TRAINING", "STAGE": "TRAINING", "TRAINING": "TRAINING", "INTERNSHIP": "TRAINING",
  // Military Service
  "SERVICE MILITAIRE": "MILITARY_SERVICE", "MILITARY SERVICE": "MILITARY_SERVICE", "MILITARY_SERVICE": "MILITARY_SERVICE",
  // Strike
  "GRÈVE": "STRIKE", "GREVE": "STRIKE", "STRIKE": "STRIKE",
  // Authorized Absence
  "AUTORISATION D'ABSENCE": "AUTHORIZED_ABSENCE", "AUTHORIZED ABSENCE": "AUTHORIZED_ABSENCE",
  "AUTHORIZED_ABSENCE": "AUTHORIZED_ABSENCE",
  // Sabbatical Leave
  "CONGÉ SABBATIQUE": "SABBATICAL_LEAVE", "SABBATICAL LEAVE": "SABBATICAL_LEAVE", "SABBATICAL_LEAVE": "SABBATICAL_LEAVE",
  // Adoption Leave
  "CONGÉ POUR ADOPTION": "ADOPTION_LEAVE", "ADOPTION LEAVE": "ADOPTION_LEAVE", "ADOPTION_LEAVE": "ADOPTION_LEAVE"
};

function getDynamicAbsenceReasonMap(): { [key: string]: string } {
    const customTypes = getCustomAbsenceTypes();
    const dynamicMap: { [key: string]: string } = {};
    customTypes.forEach(type => {
        dynamicMap[type.label.toUpperCase()] = type.reasonCode;
        dynamicMap[type.reasonCode] = type.reasonCode; // Map code to itself
    });
    return { ...STATIC_ABSENCE_REASON_MAP, ...dynamicMap };
}


// --- Version Management ---

export function getAbsenceVersion(): { version: number; recomputedAt: string } {
  const stored = localStorage.getItem(ABSENCE_VERSION_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  const initial = { version: 1, recomputedAt: new Date().toISOString() };
  localStorage.setItem(ABSENCE_VERSION_KEY, JSON.stringify(initial));
  return initial;
}

function incrementVersion() {
  const current = getAbsenceVersion();
  const next = { version: current.version + 1, recomputedAt: new Date().toISOString() };
  localStorage.setItem(ABSENCE_VERSION_KEY, JSON.stringify(next));
  // Post a message to the channel to notify all listeners of the update.
  channel.postMessage({ version: next.version });
}

export function invalidateCache() {
    incrementVersion();
}

// --- Data Access & Mutation ---

function getAbsencesStorageKey(year: number, month: number): string {
  return `${ABSENCE_DATA_KEY_PREFIX}_${year}-${month}`;
}

export function getAbsences(year: number, month: number, matricule?: string): Absence[] {
  const key = getAbsencesStorageKey(year, month);
  const stored = localStorage.getItem(key);
  let allAbsences: Absence[] = stored ? JSON.parse(stored) : [];
  if (matricule) {
    return allAbsences.filter(a => a.matricule === matricule);
  }
  return allAbsences;
}

function saveAbsences(year: number, month: number, absences: Absence[]) {
  const key = getAbsencesStorageKey(year, month);
  localStorage.setItem(key, JSON.stringify(absences));
}

function robustDateParse(dateStr: string): { year: number, month: number, day: number, date: Date } | null {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return null;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in UTC to avoid timezone shifts from local time
    const date = new Date(Date.UTC(year, month - 1, day));
    return { year, month: month - 1, day, date };
}

export function importAbsencesFromFile(records: Record<string, any>[], uploadId: string): { imported: number } {
  let importedCount = 0;
  const now = new Date().toISOString();
  
  const absencesByMonth = new Map<string, Absence[]>();
  const reasonMap = getDynamicAbsenceReasonMap();

  records.forEach(rec => {
    const reasonKey = String(rec['Absence'] || '').toUpperCase().trim();
    const reasonCode = reasonMap[reasonKey];
    const dateStr = String(rec['Date'] || '');
    
    if (!reasonCode || !dateStr || !rec['Matricule.']) return;

    const parsedDate = robustDateParse(dateStr);
    if (!parsedDate) return;
    
    if (isHoliday(dateStr).isHoliday) return; // Skip holidays

    const { year, month } = parsedDate;
    const monthKey = `${year}-${month}`;

    if (!absencesByMonth.has(monthKey)) {
        absencesByMonth.set(monthKey, getAbsences(year, month));
    }
    const monthlyAbsences = absencesByMonth.get(monthKey)!;

    const newAbsence: Absence = {
      id: crypto.randomUUID(),
      matricule: String(rec['Matricule.']),
      date: dateStr,
      reasonCode,
      source: 'FILE',
      note: String(rec['Note.'] || ''),
      uploadId,
      createdAt: now,
      updatedAt: now,
    };

    // UPSERT logic: remove existing for same matricule/date/source, then add.
    const existingIndex = monthlyAbsences.findIndex(a => 
        a.matricule === newAbsence.matricule && 
        a.date === newAbsence.date &&
        a.source === 'FILE'
    );

    if (existingIndex !== -1) {
        monthlyAbsences.splice(existingIndex, 1);
    }
    monthlyAbsences.push(newAbsence);
    importedCount++;
  });

  if (importedCount > 0) {
    absencesByMonth.forEach((absences, key) => {
        const [year, month] = key.split('-').map(Number);
        saveAbsences(year, month, absences);
    });
    incrementVersion();
  }

  return { imported: importedCount };
}

export function addAbsence(data: Omit<Absence, 'id'|'source'|'createdAt'|'updatedAt'>): { success: boolean, message?: string } {
    if (isHoliday(data.date).isHoliday) {
        return { success: false, message: "Cannot add an absence on a public holiday." };
    }
    
    const parsedDate = robustDateParse(data.date);
    if (!parsedDate) return { success: false, message: "Invalid date format." };

    const now = new Date().toISOString();
    const { year, month } = parsedDate;
    const absences = getAbsences(year, month);

    // UPSERT logic for manual entries
    const existingIndex = absences.findIndex(a => 
        a.matricule === data.matricule && 
        a.date === data.date &&
        a.source === 'MANUAL'
    );

    if (existingIndex !== -1) {
        // Update existing manual absence
        absences[existingIndex] = {
            ...absences[existingIndex],
            reasonCode: data.reasonCode,
            note: data.note,
            updatedAt: now,
        };
    } else {
        // Add new manual absence
        const newAbsence: Absence = {
            ...data,
            id: crypto.randomUUID(),
            source: 'MANUAL',
            createdAt: now,
            updatedAt: now,
        };
        absences.push(newAbsence);
    }
    
    saveAbsences(year, month, absences);
    incrementVersion();
    return { success: true };
}

export function updateAbsence(id: string, updates: Partial<Omit<Absence, 'id'>>): { success: boolean, message?: string } {
    if (updates.date && isHoliday(updates.date).isHoliday) {
        return { success: false, message: "Cannot move an absence to a public holiday." };
    }
    
    const parsedDate = robustDateParse(updates.date!);
    if (!parsedDate) return { success: false, message: "Invalid date format." };

    const { year, month } = parsedDate;
    const absences = getAbsences(year, month);
    const index = absences.findIndex(a => a.id === id);
    if (index === -1) return { success: false, message: "Absence not found." };

    const updatedAbsence = { ...absences[index], ...updates, updatedAt: new Date().toISOString() };
    absences[index] = updatedAbsence;
    saveAbsences(year, month, absences);
    incrementVersion();
    return { success: true };
}

export function deleteAbsence(id: string): boolean {
    // This is inefficient but necessary without a global absence store
    // Scan the last 2 years of months to find the record.
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 1; y--) {
        for (let m = 0; m < 12; m++) {
            const absences = getAbsences(y, m);
            const index = absences.findIndex(a => a.id === id);
            if (index !== -1) {
                absences.splice(index, 1);
                saveAbsences(y, m, absences);
                incrementVersion();
                return true;
            }
        }
    }
    return false;
}
