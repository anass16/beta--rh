import { CustomAbsenceType, AbsenceCategory } from '../types/pro-analytics';

const CUSTOM_ABSENCE_TYPES_KEY = 'hr_custom_absence_types';

export function getCustomAbsenceTypes(): CustomAbsenceType[] {
  try {
    const stored = localStorage.getItem(CUSTOM_ABSENCE_TYPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse custom absence types from localStorage", error);
    return [];
  }
}

function saveCustomAbsenceTypes(types: CustomAbsenceType[]): void {
  localStorage.setItem(CUSTOM_ABSENCE_TYPES_KEY, JSON.stringify(types));
}

export function addCustomAbsenceType(
  data: { label: string; description?: string; category: AbsenceCategory }
): { success: boolean, message?: string } {
  const { label, description, category } = data;

  if (!label || !label.trim()) {
    return { success: false, message: 'absence.error_name_required' };
  }

  const existingTypes = getCustomAbsenceTypes();
  if (existingTypes.some(t => t.label.toLowerCase() === label.trim().toLowerCase())) {
    return { success: false, message: 'absence.error_name_exists' };
  }

  const reasonCode = `CUSTOM_${label.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;

  const newType: CustomAbsenceType = {
    reasonCode,
    label: label.trim(),
    description: description?.trim(),
    category,
  };

  const updatedTypes = [...existingTypes, newType];
  saveCustomAbsenceTypes(updatedTypes);

  return { success: true };
}
