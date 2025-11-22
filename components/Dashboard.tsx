import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TimeEntry, WorkType } from '../types';

interface DashboardProps {
  entries: TimeEntry[];
  selectedMonth: string; // YYYY-MM
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ entries, selectedMonth }) => {
  const isProductive = (type: WorkType) => {
    return [WorkType.REGULAR, WorkType.OVERTIME, WorkType.BUSINESS_TRIP].includes(type);
  };

  // Calculate Monthly Work Fund
  const workFundStats = useMemo(() => {
    if (!selectedMonth) return { fund: 0, progress: 0, remaining: 0 };
    
    const [year, month] = selectedMonth.split('-').map(Number);
    // Get days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay();
      // Count Mon (1) to Fri (5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    const totalFund = workingDays * 8; // Standard 8h workday
    return { totalFund, workingDays };
  }, [selectedMonth]);

  // Calculate stats
  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const productiveHours = entries
    .filter(e => isProductive(e.type))
    .reduce((acc, curr) => acc + curr.hours, 0);
  
  const overtimeHours = entries
    .filter(e => e.type === WorkType.OVERTIME)
    .reduce((acc, curr) => acc + curr.hours, 0);
  
  // Prepare Project Data
  const projectDataMap = entries
    .filter(e => isProductive(e.type))
    .reduce((acc, curr) => {
      acc[curr.project] = (acc[curr.project] || 0) + curr.hours;
      return acc;
    }, {} as Record<string, number>);
  
  const projectData = Object.entries(projectDataMap).map(([name, value]) => ({ name, value }));

  // Prepare Type Data
  const typeDataMap = entries.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.hours;
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.entries(typeDataMap).map(([name, value]) => ({ name, value }));

  // Progress Bar Logic
  const progressPercent = Math.min(100, (totalHours / (workFundStats.totalFund || 1)) * 100);
  const isOverFund = totalHours > workFundStats.totalFund;

  return (
    <div className="space-y-6">
      {/* Work Fund Progress Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Měsíční fond pracovní doby</h3>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-3xl font-bold text-gray-900">{totalHours.toFixed(1)}</span>
                 <span className="text-gray-500">/ {workFundStats.totalFund} h</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${isOverFund ? 'text-orange-600' : 'text-indigo-600'}`}>
                {Math.round((totalHours / (workFundStats.totalFund || 1)) * 100)}%
              </span>
            </div>
         </div>
         
         <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ease-out ${isOverFund ? 'bg-orange-500' : 'bg-indigo-600'}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
         </div>
         <div className="mt-2 text-xs text-gray-400 flex justify-between">
            <span>{workFundStats.workingDays} pracovních dní</span>
            <span>
               {isOverFund 
                 ? `+ ${(totalHours - workFundStats.totalFund).toFixed(1)} h přesčas`
                 : `Chybí ${(workFundStats.totalFund - totalHours).toFixed(1)} h`
               }
            </span>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Odpracováno (Výkon)</p>
          <div className="flex items-baseline gap-2">
             <p className="text-2xl font-bold text-indigo-600">{productiveHours.toFixed(1)} h</p>
             <span className="text-xs text-gray-400">z celkových {totalHours.toFixed(1)} h</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Přesčasy</p>
          <p className={`text-2xl font-bold ${overtimeHours > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {overtimeHours.toFixed(1)} h
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Počet projektů</p>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(projectDataMap).length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[300px]">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Projektový Výkon (Odpracováno)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
              <Bar dataKey="value" name="Hodiny" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[300px]">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Struktura fondu (Typy)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;