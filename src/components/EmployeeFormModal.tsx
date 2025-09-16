import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Employee } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: { matricule: string; firstName: string; lastName: string; department: string; status: string }) => void;
  initialData?: Employee | null;
  existingDepartments: string[];
  existingMatricules: string[];
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, initialData, existingDepartments, existingMatricules }) => {
  const { t } = useI18n();
  const isEditMode = !!initialData;
  
  const [matricule, setMatricule] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('Active');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setMatricule(initialData.matricule);
        setFirstName(initialData.firstName);
        setLastName(initialData.lastName);
        setDepartment(initialData.department);
        setStatus(initialData.status);
      } else {
        setMatricule('');
        setFirstName('');
        setLastName('');
        setDepartment('');
        setStatus('Active');
      }
      setError('');
    }
  }, [isOpen, isEditMode, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!matricule.trim() || !firstName.trim() || !lastName.trim() || !department.trim()) {
      setError(t('error_required_fields'));
      return;
    }
    if (!isEditMode && existingMatricules.includes(matricule.trim())) {
      setError(t('error_matricule_exists'));
      return;
    }
    onSave({ matricule: matricule.trim(), firstName: firstName.trim(), lastName: lastName.trim(), department, status });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? t('form_title_edit') : t('form_title_add')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="matricule" className="block text-sm font-medium text-gray-700">{t('label_matricule')}</label>
              <input type="text" id="matricule" value={matricule} onChange={(e) => setMatricule(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md disabled:bg-gray-100" required disabled={isEditMode} />
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">{t('label_firstname')}</label>
              <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">{t('label_lastname')}</label>
              <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">{t('label_department')}</label>
              <input type="text" id="department" list="departments-list" value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
              <datalist id="departments-list">{existingDepartments.map(dept => <option key={dept} value={dept} />)}</datalist>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">{t('label_status')}</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full px-3 py-2 border bg-white rounded-md">
                <option>Active</option><option>Inactive</option><option>Pending</option>
              </select>
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

export default EmployeeFormModal;
