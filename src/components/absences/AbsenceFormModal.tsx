import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Absence } from '../../types/pro-analytics';
import { useI18n } from '../../contexts/I18nContext';
import { format } from 'date-fns';

interface AbsenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Absence, 'id' | 'source' | 'createdAt' | 'updatedAt'>) => void;
  matricule: string;
  initialData?: Absence | null;
}

const REASON_CODES = ['ABSENT', 'SICK', 'LEAVE', 'UNPAID'];

const AbsenceFormModal: React.FC<AbsenceFormModalProps> = ({ isOpen, onClose, onSave, matricule, initialData }) => {
  const { t } = useI18n();
  const isEditMode = !!initialData;
  
  const [date, setDate] = useState('');
  const [reasonCode, setReasonCode] = useState('ABSENT');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setDate(initialData.date);
        setReasonCode(initialData.reasonCode);
        setNote(initialData.note || '');
      } else {
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setReasonCode('ABSENT');
        setNote('');
      }
      setError('');
    }
  }, [isOpen, isEditMode, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!date) {
      setError(t('absence.error_date_required'));
      return;
    }
    if (!reasonCode) {
      setError(t('absence.error_reason_required'));
      return;
    }
    onSave({ matricule, date, reasonCode, note });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? t('absence.form_title_edit') : t('absence.form_title_add')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">{t('absence.label_date')}</label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="reasonCode" className="block text-sm font-medium text-gray-700">{t('absence.label_reason')}</label>
              <select id="reasonCode" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="mt-1 block w-full px-3 py-2 border bg-white rounded-md">
                {REASON_CODES.map(code => (
                  <option key={code} value={code}>{t(`absence.reason.${code}` as any, code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">{t('absence.label_note')}</label>
              <input type="text" id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="e.g., Doctor appointment" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-white border rounded-md hover:bg-gray-50">{t('btn_cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">{t('btn_save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AbsenceFormModal;
