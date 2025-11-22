import React, { useState } from 'react';
import { CalendarEvent, TimeEntry, WorkType } from '../types';
import { mapCalendarEventsToEntries } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface CalendarIntegrationProps {
  existingEntries: TimeEntry[];
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
}

// Mock data for demo purposes
const MOCK_EVENTS: CalendarEvent[] = [
    { id: '1', title: 'Porada: Website Redesign', start: '2023-10-04T09:00:00', end: '2023-10-04T10:00:00', isImported: false },
    { id: '2', title: 'Deep Work: API Coding', start: '2023-10-04T10:30:00', end: '2023-10-04T12:30:00', isImported: false },
    { id: '3', title: 'Client Call: Projekt X', start: '2023-10-04T14:00:00', end: '2023-10-04T15:00:00', isImported: false },
    { id: '4', title: 'Code Review', start: '2023-10-05T10:00:00', end: '2023-10-05T11:30:00', isImported: false },
];

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ existingEntries, onEntriesAdded, currentUserId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  const handleConnect = () => {
    // Simulate API call to Google Calendar
    setTimeout(() => {
        setIsConnected(true);
        setEvents(MOCK_EVENTS);
        // Select all by default
        setSelectedEventIds(new Set(MOCK_EVENTS.map(e => e.id)));
    }, 800);
  };

  const toggleEventSelection = (id: string) => {
      const newSet = new Set(selectedEventIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedEventIds(newSet);
  };

  const handleSync = async () => {
      if (selectedEventIds.size === 0) return;
      
      setIsProcessing(true);
      try {
          const eventsToProcess = events.filter(e => selectedEventIds.has(e.id));
          
          // Get unique project names to help AI context
          const distinctProjects = Array.from(new Set(existingEntries.map(e => e.project))) as string[];
          
          const parsedEntries = await mapCalendarEventsToEntries(eventsToProcess, distinctProjects);
          
          const newEntries: TimeEntry[] = parsedEntries.map(item => ({
              id: uuidv4(),
              employeeId: currentUserId,
              date: item.date || new Date().toISOString().split('T')[0],
              project: item.project || 'General',
              description: item.description || 'Imported from Calendar',
              hours: item.hours || 0,
              type: item.type || WorkType.REGULAR
          }));

          onEntriesAdded(newEntries);
          
          // Mark as imported locally
          setEvents(prev => prev.map(e => selectedEventIds.has(e.id) ? { ...e, isImported: true } : e));
          setSelectedEventIds(new Set());

      } catch (error) {
          console.error(error);
          alert("Chyba při synchronizaci.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (!isConnected) {
      return (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Propojení s Kalendářem</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Automaticky načtěte události z vašeho kalendáře a AI je převede na výkazy práce. Ušetříte čas s manuálním zadáváním.
              </p>
              <button 
                  onClick={handleConnect}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                  Propojit Google Calendar
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Nalezené události</h3>
                <button
                    onClick={handleSync}
                    disabled={selectedEventIds.size === 0 || isProcessing}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedEventIds.size === 0 || isProcessing
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {isProcessing ? 'Zpracovávám...' : `Převést vybrané (${selectedEventIds.size})`}
                </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                <input 
                                    type="checkbox" 
                                    checked={selectedEventIds.size === events.filter(e => !e.isImported).length && events.length > 0}
                                    onChange={() => {
                                        if (selectedEventIds.size > 0) {
                                            setSelectedEventIds(new Set());
                                        } else {
                                            setSelectedEventIds(new Set(events.filter(e => !e.isImported).map(e => e.id)));
                                        }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Událost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Čas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {events.map(event => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            
                            return (
                                <tr key={event.id} className={event.isImported ? 'bg-gray-50 opacity-60' : 'hover:bg-indigo-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {!event.isImported && (
                                            <input 
                                                type="checkbox" 
                                                checked={selectedEventIds.has(event.id)}
                                                onChange={() => toggleEventSelection(event.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                        <div className="text-xs text-gray-500">{duration.toFixed(1)} hod</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {start.toLocaleDateString('cs-CZ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {event.isImported ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Importováno
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                K importu
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default CalendarIntegration;