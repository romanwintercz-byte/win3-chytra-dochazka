
import React from 'react';
import { TimeEntry, WorkType } from '../types';
import { getHolidayName } from '../services/holidayService';

interface TimesheetTableProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
  isLocked?: boolean;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, onDelete, onEdit, isLocked = false }) => {
  // Sort entries by date desc
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getWorkTypeBadge = (type: WorkType) => {
    switch (type) {
      case WorkType.REGULAR: return 'bg-blue-100 text-blue-800';
      case WorkType.OVERTIME: return 'bg-orange-100 text-orange-800';
      case WorkType.VACATION: return 'bg-green-100 text-green-800';
      case WorkType.SICK_DAY: return 'bg-red-100 text-red-800';
      case WorkType.HOLIDAY: return 'bg-indigo-100 text-indigo-800';
      case WorkType.OCR: return 'bg-pink-100 text-pink-800';
      case WorkType.DOCTOR: return 'bg-yellow-100 text-yellow-800';
      case WorkType.BUSINESS_TRIP: return 'bg-purple-100 text-purple-800';
      case WorkType.UNPAID_LEAVE: return 'bg-gray-200 text-gray-800';
      case WorkType.COMPENSATORY_LEAVE: return 'bg-teal-100 text-teal-800';
      case WorkType.OTHER_OBSTACLE: return 'bg-gray-100 text-gray-600';
      case WorkType.SIXTY_PERCENT: return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekt</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popis</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hodiny</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Zatím žádné záznamy. {isLocked ? 'V uzamčeném měsíci nelze přidávat data.' : 'Použijte AI formulář výše nebo přidejte záznam ručně.'}
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => {
                const holidayName = getHolidayName(entry.date);
                return (
                  <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${holidayName ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                         <span>{new Date(entry.date).toLocaleDateString('cs-CZ')}</span>
                         {holidayName && <span className="text-xs text-indigo-600 font-medium">{holidayName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {entry.project}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={entry.description}>
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getWorkTypeBadge(entry.type)}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono font-bold text-indigo-600">
                      {entry.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(entry)}
                          disabled={isLocked}
                          className={`p-1 transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'}`}
                          title={isLocked ? "Uzamčeno" : "Upravit"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          disabled={isLocked}
                          className={`p-1 transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                          title={isLocked ? "Uzamčeno" : "Smazat"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimesheetTable;
