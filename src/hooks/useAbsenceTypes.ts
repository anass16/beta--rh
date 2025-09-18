import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { getCustomAbsenceTypes } from '../services/absenceTypeManager';

const STATIC_REASON_CODES = [
  'UNJUSTIFIED_ABSENCE', 'SICK_LEAVE', 'ANNUAL_LEAVE', 'UNPAID_LEAVE',
  'EXCEPTIONAL_LEAVE', 'MATERNITY_PATERNITY_LEAVE', 'PARENTAL_LEAVE',
  'WORK_ACCIDENT', 'UNJUSTIFIED_LATENESS', 'UNJUSTIFIED_EARLY_DEPARTURE',
  'PROFESSIONAL_MISSION', 'TRAINING', 'MILITARY_SERVICE', 'STRIKE',
  'AUTHORIZED_ABSENCE', 'SABBATICAL_LEAVE', 'ADOPTION_LEAVE',
];

export interface AbsenceTypeOption {
  code: string;
  label: string;
}

export function useAbsenceTypes() {
  const { t } = useI18n();
  const [customTypes, setCustomTypes] = useState(() => getCustomAbsenceTypes());

  const refreshTypes = useCallback(() => {
    setCustomTypes(getCustomAbsenceTypes());
  }, []);

  const allTypes = useMemo<AbsenceTypeOption[]>(() => {
    const staticTypes: AbsenceTypeOption[] = STATIC_REASON_CODES.map(code => ({
      code,
      label: t(`absence.reason.${code}` as any, code),
    }));

    const dynamicTypes: AbsenceTypeOption[] = customTypes.map(type => ({
      code: type.reasonCode,
      label: type.label,
    }));

    return [...staticTypes, ...dynamicTypes].sort((a, b) => a.label.localeCompare(b.label));
  }, [t, customTypes]);

  return { allTypes, refreshTypes };
}
