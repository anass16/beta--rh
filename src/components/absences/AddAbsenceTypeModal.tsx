import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AbsenceCategory } from '../../types/pro-analytics';
import { useI18n } from '../../contexts/I18nContext';
import { addCustomAbsenceType } from '../../services/absenceTypeManager';

interface AddAbsenceTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: AbsenceCategory[] = ['JUSTIFIED', 'UNJUSTIFIED', 'WORK_RELATED', 'SPECIAL'];

const AddAbsenceTypeModal: React.FC<AddAbsenceTypeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18n();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AbsenceCategory>('JUSTIFIED');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const result = addCustomAbsenceType({ label, description, category });

    if (result.success) {
      setSuccessMessage(t('absence.add_type_success').replace('{label}', label));
      setLabel('');
      setDescription('');
      setCategory('JUSTIFIED');
      onSuccess(); // Notify parent to refresh
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 2000);
    } else if (result.message) {
      setError(t(result.message as any, result.message));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t('absence.add_type_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('absence.label_name')}</label>
              <input type="text" id="name" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('absence.label_description')}</label>
              <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">{t('absence.label_category')}</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value as AbsenceCategory)} className="mt-1 block w-full px-3 py-2 border bg-white rounded-md">
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{t(`absence.category.${cat}` as any, cat)}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
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

export default AddAbsenceTypeModal;
