import React from 'react';
import { Absence } from '../../types/pro-analytics';
import { useI18n } from '../../contexts/I18nContext';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Edit, Trash2 } from 'lucide-react';

interface AbsenceListProps {
  absences: Absence[];
  isLoading: boolean;
  onEdit: (absence: Absence) => void;
  onDelete: (id: string) => void;
}

const AbsenceList: React.FC<AbsenceListProps> = ({ absences, isLoading, onEdit, onDelete }) => {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (!absences || absences.length === 0) {
    return (
      <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg">
        <CalendarDays className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600">{t('absence.list_empty')}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {absences.map(absence => (
          <li key={absence.id} className="p-3 flex items-center justify-between hover:bg-gray-50" title={absence.note}>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-800">{format(parseISO(absence.date), 'EEE, dd MMM yyyy')}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${absence.source === 'FILE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {t(`absence.reason.${absence.reasonCode}` as any, absence.reasonCode)}
                </span>
              </div>
              {absence.note && <p className="text-sm text-gray-500 mt-1 italic truncate">"{absence.note}"</p>}
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={() => onEdit(absence)} className="p-1 text-gray-500 hover:text-blue-600" title={t('form_title_edit')}>
                    <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(absence.id)} className="p-1 text-gray-500 hover:text-red-600" title={t('btn_delete_all')}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AbsenceList;
