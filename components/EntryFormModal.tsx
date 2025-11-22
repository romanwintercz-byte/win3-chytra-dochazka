import React, { useState, useEffect } from 'react';
import { TimeEntry, Job, WorkType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entries: TimeEntry[]) => void;
  initialData: TimeEntry | null;
  currentUserId: string;
  jobs: Job[];
  lastEntry?: TimeEntry | null; // For "Copy Last" feature
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({ 
  isOpen, onClose, onSubmit, initialData, currentUserId, jobs, lastEntry 
}) => {
  const [date, setDate] = useState('');
  const [dateTo, setDateTo] = useState(''); // For Range
  const [isRange, setIsRange] = useState(false);
  
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [type, setType] = useState<WorkType>(WorkType.REGULAR);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setProject(initialData.project);
      setDescription(initialData.description);
      setHours(initialData.hours);
      setType(initialData.type);
      setIsRange(false);
      setDateTo('');
    } else {
      // Defaults for new entry
      setDate(new Date().toISOString().split('T')[0]);
      setProject(jobs.length > 0 ? jobs[0].name : '');
      setDescription('');
      setHours(8);
      setType(WorkType.REGULAR);
      setIsRange(false);
      setDateTo('');
    }
  }, [initialData, isOpen, jobs]);

  const handleCopyLast = () => {
    if (lastEntry) {
      setProject(lastEntry.project);
      setDescription(lastEntry.description);
      setHours(lastEntry.hours);
      setType(lastEntry.type);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const generatedEntries: TimeEntry[] = [];

    if (isRange && !initialData && dateTo) {
      // Bulk Create Mode
      const startDate = new Date(date);
      const endDate = new Date(dateTo);
      
      // Loop through dates
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Skip Saturday (6) and Sunday (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const isoDate = d.toISOString().split('T')[0];
          generatedEntries.push({
            id: uuidv4(),
            employeeId: currentUserId,
            date: isoDate,
            project,
            description,
            hours: Number(hours),
            type
          });
        }
      }
    } else {
      // Single Entry Mode (Create or Edit)
      generatedEntries.push({
        id: initialData ? initialData.id : uuidv4(),
        employeeId: initialData ? initialData.employeeId : currentUserId,
        date,
        project,
        description,
        hours: Number(hours),
        type
      });
    }

    if (generatedEntries.length === 0 && isRange) {
      alert("V zadaném rozmezí nejsou žádné pracovní dny.");
      return;
    }

    onSubmit(generatedEntries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Upravit záznam' : 'Nový záznam ručně'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Copy Last Entry Button (Only for new entries) */}
          {!initialData && lastEntry && (
            <button
              type="button"
              onClick={handleCopyLast}
              className="w-full text-xs flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors mb-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
               </svg>
               Načíst data z minula ({lastEntry.project})
            </button>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Datum</label>
                {!initialData && (
                  <label className="flex items-center cursor-pointer text-xs text-indigo-600">
                    <input 
                      type="checkbox" 
                      checked={isRange} 
                      onChange={(e) => setIsRange(e.target.checked)}
                      className="mr-1 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Více dní (Hromadně)
                  </label>
                )}
             </div>
             
             <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {isRange && !initialData && (
                  <>
                    <span className="flex items-center text-gray-400">až</span>
                    <input
                      type="date"
                      required
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </>
                )}
             </div>
             {isRange && !initialData && (
               <p className="text-xs text-gray-500 italic">Víkendy budou automaticky přeskočeny.</p>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Projekt / Zakázka</label>
            <select
              required
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Vyberte projekt...</option>
              {jobs.map(job => (
                <option key={job.id} value={job.name}>{job.name} ({job.code})</option>
              ))}
              <option value="General">Obecné / Režie</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Popis práce <span className="text-gray-400 text-xs font-normal">(volitelné)</span></label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Co jste dělali..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Počet hodin</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                required
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkType)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.values(WorkType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md"
            >
              {initialData 
                 ? 'Uložit změny' 
                 : (isRange ? 'Hromadně přidat' : 'Přidat záznam')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryFormModal;