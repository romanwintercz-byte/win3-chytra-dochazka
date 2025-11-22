
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SmartInput from './components/SmartInput';
import TimesheetTable from './components/TimesheetTable';
import Dashboard from './components/Dashboard';
import ReportingModule from './components/ReportingModule';
import ApprovalWorkflow from './components/ApprovalWorkflow';
import AdminPanel from './components/AdminPanel';
import MobileNavigation from './components/MobileNavigation';
import EntryFormModal from './components/EntryFormModal';
import ValidationStatus from './components/ValidationStatus';
import TeamOverview from './components/TeamOverview';
import HelpSystem from './components/HelpSystem';
import AboutModal from './components/AboutModal';
import { TimeEntry, WorkType, MonthStatus, TimesheetStatus, Employee, Job } from './types';
import { analyzeTimesheet } from './services/geminiService';
import { validateMonth } from './services/validationService';
import { v4 as uuidv4 } from 'uuid';

// Mock Initial Data
const initialEmployees: Employee[] = [
  { id: '1', name: 'Jan Novák', role: 'Zaměstnanec', email: 'jan@smartwork.cz', avatar: 'https://ui-avatars.com/api/?name=Jan+Novak&background=random' },
  { id: '2', name: 'Petr Manažer', role: 'Manager', email: 'petr@smartwork.cz', avatar: 'https://ui-avatars.com/api/?name=Petr+Manager&background=random' }
];

const initialJobs: Job[] = [
  { id: 'j1', code: 'WEB-001', name: 'Website Redesign', isActive: true },
  { id: 'j2', code: 'INT-202', name: 'Internal Tool', isActive: true },
  { id: 'j3', code: 'MKT-101', name: 'Marketing Campaign', isActive: true },
];

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

const initialData: TimeEntry[] = [
  { id: uuidv4(), employeeId: '1', date: `${getCurrentMonth()}-01`, project: 'Website Redesign', description: 'Kickoff meeting', hours: 2, type: WorkType.REGULAR },
  { id: uuidv4(), employeeId: '1', date: `${getCurrentMonth()}-01`, project: 'Website Redesign', description: 'Wireframing', hours: 6, type: WorkType.REGULAR },
  { id: uuidv4(), employeeId: '1', date: `${getCurrentMonth()}-02`, project: 'Internal Tool', description: 'Bug fixing', hours: 8, type: WorkType.REGULAR },
  { id: uuidv4(), employeeId: '1', date: `${getCurrentMonth()}-03`, project: 'Website Redesign', description: 'Deployment hotfix', hours: 2, type: WorkType.OVERTIME },
  { id: uuidv4(), employeeId: '2', date: `${getCurrentMonth()}-03`, project: 'Marketing Campaign', description: 'Strategy planning', hours: 4, type: WorkType.REGULAR },
];

const initialMonthStatus: MonthStatus = {
  month: getCurrentMonth(),
  status: TimesheetStatus.DRAFT,
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [entries, setEntries] = useState<TimeEntry[]>(initialData);
  
  // User Session State
  const [currentUserId, setCurrentUserId] = useState<string>(initialEmployees[0].id);
  const currentUser = employees.find(e => e.id === currentUserId) || employees[0];

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  const [monthStatus, setMonthStatus] = useState<MonthStatus>(initialMonthStatus);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Manual Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // About Modal State
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Simulation for "Manager View" inside specific workflows (derived from role)
  const isManagerRole = currentUser.role === 'Manager';
  const [isManagerMode, setIsManagerMode] = useState(false);

  // Determine if the current view is locked for editing
  const isLocked = useMemo(() => {
    // Locked if Submitted or Approved. Manager can always approve/reject, but not necessarily edit user data directly in this view without rejecting first.
    // For simplicity: Locked means user cannot Add/Edit/Delete.
    return monthStatus.status === TimesheetStatus.SUBMITTED || monthStatus.status === TimesheetStatus.APPROVED;
  }, [monthStatus.status]);

  // 1. All entries for the current user (Unfiltered by date) - Used for Reports
  const allUserEntries = useMemo(() => {
    return entries.filter(e => e.employeeId === currentUserId);
  }, [entries, currentUserId]);

  // 2. Entries for the current user AND selected month - Used for Overview/Dashboard
  const monthlyUserEntries = useMemo(() => {
    return allUserEntries.filter(e => e.date.startsWith(selectedMonth));
  }, [allUserEntries, selectedMonth]);

  // 3. Get Last Entry for "Copy" functionality (Last added in the whole list)
  const lastEntry = useMemo(() => {
    if (allUserEntries.length === 0) return null;
    return allUserEntries[allUserEntries.length - 1];
  }, [allUserEntries]);

  // 4. Validation Logic
  const validationIssues = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Sync isManagerMode with Role when user switches
  useEffect(() => {
    setIsManagerMode(currentUser.role === 'Manager');
  }, [currentUser]);

  // Sync Month Status when month changes (mock implementation)
  useEffect(() => {
    // In a real app, fetch status for the selected month
    // Reset to DRAFT if changed for demo purposes, unless we persist it
    setMonthStatus(prev => ({...prev, month: selectedMonth, status: prev.month === selectedMonth ? prev.status : TimesheetStatus.DRAFT }));
  }, [selectedMonth]);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleAddEntries = (newEntries: TimeEntry[]) => {
    if (isLocked) {
      alert("Nelze přidávat záznamy do odeslaného nebo schváleného výkazu.");
      return;
    }
    setEntries(prev => [...prev, ...newEntries]);
  };

  const handleModalSubmit = (submittedEntries: TimeEntry[]) => {
    if (isLocked) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    
    setEntries(prev => {
      let newEntriesList = [...prev];

      submittedEntries.forEach(subEntry => {
         const index = newEntriesList.findIndex(e => e.id === subEntry.id);
         if (index !== -1) {
           // Update existing
           newEntriesList[index] = subEntry;
         } else {
           // Add new
           newEntriesList.push(subEntry);
         }
      });
      return newEntriesList;
    });
  };

  const handleDeleteEntry = (id: string) => {
    if (isLocked) {
      alert("Nelze mazat záznamy v uzamčeném výkazu.");
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditEntry = (entry: TimeEntry) => {
    if (isLocked) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    if (isLocked) {
      alert("Nelze přidávat záznamy do uzamčeného výkazu.");
      return;
    }
    setEditingEntry(null); // Clear editing state for new entry
    setIsEntryModalOpen(true);
  };

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze current user's entries
      const result = await analyzeTimesheet(monthlyUserEntries);
      setAiAnalysis(result);
    } catch (error) {
      setAiAnalysis("Chyba při generování analýzy.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusUpdate = (newStatus: TimesheetStatus, comment?: string) => {
    setMonthStatus(prev => ({
      ...prev,
      status: newStatus,
      managerComment: comment || prev.managerComment,
      submittedAt: newStatus === TimesheetStatus.SUBMITTED ? new Date().toISOString() : prev.submittedAt,
      approvedAt: newStatus === TimesheetStatus.APPROVED ? new Date().toISOString() : prev.approvedAt
    }));
  };

  // Admin Handlers
  const handleAddEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const handleRemoveEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));
  const handleAddJob = (job: Job) => setJobs(prev => [...prev, job]);
  const handleRemoveJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f6]">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        installPrompt={installPrompt}
        onInstall={handleInstallClick}
        currentUser={currentUser}
        employees={employees}
        onSwitchUser={setCurrentUserId}
        onShowAbout={() => setIsAboutOpen(true)}
      />

      {/* Mobile Header with User Switcher */}
      <div className="md:hidden bg-slate-900 text-white p-4 pt-[env(safe-area-inset-top,20px)] flex justify-between items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => setIsAboutOpen(true)} className="flex items-center gap-2">
           {/* Win3 Logo Mobile */}
           <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 30 L40 75 L60 30 L80 75 L100 30" stroke="white" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           </div>
           <div className="flex flex-col">
             <h1 className="font-bold text-lg leading-none">Chytrá</h1>
             <span className="text-[10px] text-indigo-300 font-bold leading-none">DOCHÁZKA</span>
           </div>
        </button>
        <div className="flex items-center gap-3">
           {installPrompt && (
              <button onClick={handleInstallClick} className="text-xs bg-indigo-600 px-2 py-1 rounded">
                Instalovat
              </button>
           )}
           
           {/* Mobile User Switcher */}
           <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-3 py-1 border border-slate-700">
              <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
              <select 
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="bg-transparent text-white text-xs font-medium border-none focus:ring-0 p-0 max-w-[100px] truncate cursor-pointer outline-none"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      <main className="flex-1 p-0 overflow-y-auto flex flex-col h-screen md:h-auto">
        
        {/* Approval Bar */}
        {activeTab === 'overview' && (
          <ApprovalWorkflow 
            status={monthStatus} 
            onUpdateStatus={handleStatusUpdate}
            isManagerMode={isManagerMode}
            validationIssues={validationIssues}
          />
        )}

        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pb-24 md:pb-8">
          
          {/* Header with Month Selector - Visible mainly in Overview */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 mt-4 md:mt-0">
            <div className="w-full sm:w-auto">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'overview' && `Denní přehled: ${currentUser.name}`}
                {activeTab === 'report' && 'Reporty & Export'}
                {activeTab === 'settings' && 'Admin & Nastavení'}
              </h2>
              
              {activeTab === 'overview' && (
                <div className="flex items-center gap-2 mt-3 bg-white p-1 rounded-lg border border-gray-300 shadow-sm w-fit">
                   <button 
                      onClick={() => changeMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                      aria-label="Předchozí měsíc"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                   </button>
                   
                   <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="border-none focus:ring-0 text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer py-1"
                   />
                   
                   <button 
                      onClick={() => changeMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                      aria-label="Další měsíc"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                   </button>
                </div>
              )}
            </div>
            
            {activeTab === 'overview' && isManagerMode && (
               <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-md text-xs font-bold border border-purple-200 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                 </svg>
                 MANAŽERSKÝ PŘÍSTUP
               </div>
            )}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Team Overview for Managers */}
              {isManagerMode && (
                <TeamOverview 
                  employees={employees}
                  allEntries={entries}
                  selectedMonth={selectedMonth}
                  onSwitchUser={setCurrentUserId}
                  currentUserRole={currentUser.role}
                />
              )}

              {!isLocked && (
                 <SmartInput 
                    onEntriesAdded={handleAddEntries} 
                    currentUserId={currentUserId}
                    availableJobs={jobs}
                    onManualEntry={handleOpenManualEntry}
                 />
              )}

              {isLocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                   </svg>
                   <span className="font-medium text-sm">Měsíc je uzamčen. Editace není povolena.</span>
                </div>
              )}
              
              <div className="mb-8">
                <Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} />
              </div>

              {/* Health Check / Validation Status */}
              <ValidationStatus issues={validationIssues} />

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Moje záznamy ({selectedMonth})</h3>
              <TimesheetTable 
                entries={monthlyUserEntries} 
                onDelete={handleDeleteEntry} 
                onEdit={handleEditEntry}
                isLocked={isLocked}
              />
            </>
          )}

          {activeTab === 'report' && (
             <div className="space-y-8">
                {/* Reporting Module - Uses ALL user entries (unfiltered by month) unless manager (then all entries) */}
                <ReportingModule 
                  entries={isManagerMode ? entries : allUserEntries} 
                  employees={employees}
                />

                {/* AI Analysis Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">AI Souhrn pro Management</h3>
                    <button 
                      onClick={handleGenerateAnalysis}
                      disabled={isAnalyzing}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-2"
                    >
                      {isAnalyzing ? 'Analyzuji...' : 'Vygenerovat novou analýzu'}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  
                  {aiAnalysis ? (
                    <div className="prose prose-indigo max-w-none bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-gray-700 whitespace-pre-line">
                      {aiAnalysis}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <p className="text-gray-500 mb-2">Zatím nebyla vygenerována žádná analýza.</p>
                      <button 
                        onClick={handleGenerateAnalysis}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        Analyzovat data pomocí AI
                      </button>
                    </div>
                  )}
               </div>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
               {/* Admin Panel */}
               <AdminPanel 
                  employees={employees}
                  onAddEmployee={handleAddEmployee}
                  onRemoveEmployee={handleRemoveEmployee}
                  jobs={jobs}
                  onAddJob={handleAddJob}
                  onRemoveJob={handleRemoveJob}
               />
            </div>
          )}

        </div>
      </main>
      
      {/* Help System */}
      <HelpSystem />
      
      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Mobile Bottom Navigation */}
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Manual Entry / Edit Modal */}
      <EntryFormModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingEntry}
        currentUserId={currentUserId}
        jobs={jobs}
        lastEntry={lastEntry}
      />
    </div>
  );
};

export default App;
