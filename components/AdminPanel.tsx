import React, { useState } from 'react';
import { Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AdminPanelProps {
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onRemoveJob: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, onAddEmployee, onRemoveEmployee,
  jobs, onAddJob, onRemoveJob
}) => {
  const [activeSection, setActiveSection] = useState<'employees' | 'jobs'>('employees');
  
  // Employee Form State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Manager' | 'Zaměstnanec'>('Zaměstnanec');

  // Job Form State
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  const handleAddEmployee = () => {
    if (!newEmpName || !newEmpEmail) return;
    onAddEmployee({
      id: uuidv4(),
      name: newEmpName,
      email: newEmpEmail,
      role: newEmpRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmpName)}&background=random`
    });
    setNewEmpName('');
    setNewEmpEmail('');
  };

  const handleAddJob = () => {
    if (!newJobName || !newJobCode) return;
    onAddJob({
      id: uuidv4(),
      name: newJobName,
      code: newJobCode,
      isActive: true
    });
    setNewJobName('');
    setNewJobCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('employees')}
          className={`py-2 px-4 font-medium border-b-2 transition-colors ${
            activeSection === 'employees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Zaměstnanci
        </button>
        <button
          onClick={() => setActiveSection('jobs')}
          className={`py-2 px-4 font-medium border-b-2 transition-colors ${
            activeSection === 'jobs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Zakázky
        </button>
      </div>

      {activeSection === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Přidat zaměstnance</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jméno a Příjmení</label>
                <input
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="např. Petr Novák"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="petr@firma.cz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="Zaměstnanec">Zaměstnanec</option>
                  <option value="Manager">Manažer</option>
                </select>
              </div>
              <button
                onClick={handleAddEmployee}
                disabled={!newEmpName || !newEmpEmail}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 mt-2"
              >
                Přidat uživatele
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Seznam zaměstnanců</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.role} • {emp.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveEmployee(emp.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Přidat novou zakázku</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kód zakázky</label>
                <input
                  type="text"
                  value={newJobCode}
                  onChange={(e) => setNewJobCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="např. 2023-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název projektu</label>
                <input
                  type="text"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="např. Redesign E-shopu"
                />
              </div>
              <button
                onClick={handleAddJob}
                disabled={!newJobName || !newJobCode}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 mt-2"
              >
                Vytvořit zakázku
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Aktivní zakázky</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                   <div>
                      <div className="font-medium text-gray-900">{job.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{job.code}</div>
                    </div>
                  <button
                    onClick={() => onRemoveJob(job.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;