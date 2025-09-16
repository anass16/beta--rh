import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: { name: string; department: string; status: string }) => void;
  existingDepartments: string[];
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSave, existingDepartments }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('Active');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !department.trim()) {
      alert('Name and Department are required.');
      return;
    }
    onSave({ name, department, status });
    // Reset form
    setName('');
    setDepartment('');
    setStatus('Active');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Add New Employee</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <input
                type="text"
                id="department"
                list="departments-list"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
              />
              <datalist id="departments-list">
                {existingDepartments.map(dept => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Save Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
