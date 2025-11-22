
import React from 'react';
import { Employee, TimeEntry } from '../types';

interface TeamOverviewProps {
  employees: Employee[];
  allEntries: TimeEntry[];
  selectedMonth: string;
  onSwitchUser: (employeeId: string) => void;
  currentUserRole: string;
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ employees, allEntries, selectedMonth, onSwitchUser, currentUserRole }) => {
  if (currentUserRole !== 'Manager') return null;

  const getStatsForEmployee = (empId: string) => {
    const empEntries = allEntries.filter(e => e.employeeId === empId && e.date.startsWith(selectedMonth));
    const totalHours = empEntries.reduce((sum, e) => sum + e.hours, 0);
    const lastEntry = empEntries.length > 0 
        ? empEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
        : null;
    
    // Estimate "Work Fund" (Simple calculation: 20 days * 8h = 160h approx)
    // In real app, use the precise calculation from Dashboard
    const estimatedFund = 160; 
    const progress = Math.min(100, (totalHours / estimatedFund) * 100);

    return { totalHours, lastEntry, progress, entryCount: empEntries.length };
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Týmový přehled ({selectedMonth})
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zaměstnanec</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odpracováno</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poslední aktivita</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postup</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(emp => {
                    const stats = getStatsForEmployee(emp.id);
                    return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <img className="h-8 w-8 rounded-full mr-3" src={emp.avatar} alt="" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                        <div className="text-xs text-gray-500">{emp.role}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <span className="text-sm font-bold text-gray-900">{stats.totalHours.toFixed(1)} h</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stats.lastEntry ? new Date(stats.lastEntry).toLocaleDateString('cs-CZ') : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-middle">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${stats.progress}%`}}></div>
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button 
                                    onClick={() => onSwitchUser(emp.id)}
                                    className="text-indigo-600 hover:text-indigo-900 border border-indigo-100 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                                >
                                    Zkontrolovat
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamOverview;
