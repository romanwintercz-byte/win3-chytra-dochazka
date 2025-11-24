
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

// Real Data - Employees
const initialEmployees: Employee[] = [
  { id: '1', name: 'Jiří Bartoš', role: 'Zaměstnanec', email: 'jiri.bartos@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jiri+Bartos&background=random' },
  { id: '2', name: 'Bohumil Doseděl', role: 'Zaměstnanec', email: 'bohumil.dosedel@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Bohumil+Dosedel&background=random' },
  { id: '3', name: 'Jan Klusal', role: 'Zaměstnanec', email: 'jan.klusal@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jan+Klusal&background=random' },
  { id: '4', name: 'Martina Páchová', role: 'Zaměstnanec', email: 'martina.pachova@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Martina+Pachova&background=random' },
  { id: '5', name: 'Rudolf Seidel', role: 'Zaměstnanec', email: 'rudolf.seidel@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Rudolf+Seidel&background=random' },
  { id: '6', name: 'Tomáš Záhořík', role: 'Zaměstnanec', email: 'tomas.zahorik@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Tomas+Zahorik&background=random' },
  { id: '7', name: 'Marek Zámečník', role: 'Zaměstnanec', email: 'marek.zamecnik@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Marek+Zamecnik&background=random' },
  { id: '8', name: 'Petr Choutka', role: 'Zaměstnanec', email: 'petr.choutka@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Petr+Choutka&background=random' },
  { id: '9', name: 'Petr Šimon', role: 'Zaměstnanec', email: 'petr.simon@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Petr+Simon&background=random' },
  { id: '10', name: 'Jaroslav Poborský', role: 'Zaměstnanec', email: 'jaroslav.poborsky@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jaroslav+Poborsky&background=random' },
  { id: '11', name: 'Jiří Konáš', role: 'Zaměstnanec', email: 'jiri.konas@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jiri+Konas&background=random' },
  { id: '12', name: 'Jan Vacenovský', role: 'Zaměstnanec', email: 'jan.vacenovsky@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jan+Vacenovsky&background=random' },
  { id: '13', name: 'Lucie Winterová', role: 'Manager', email: 'lucie.winterova@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Lucie+Winterova&background=random' },
  { id: '14', name: 'Tomáš Vlček', role: 'Zaměstnanec', email: 'tomas.vlcek@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Tomas+Vlcek&background=random' },
  { id: '15', name: 'Petr Marek', role: 'Zaměstnanec', email: 'petr.marek@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Petr+Marek&background=random' },
  { id: '16', name: 'Vít Vávra', role: 'Zaměstnanec', email: 'vit.vavra@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Vit+Vavra&background=random' },
  { id: '17', name: 'Jakub Doležal', role: 'Zaměstnanec', email: 'jakub.dolezal@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Jakub+Dolezal&background=random' },
  { id: '18', name: 'Filip Cirhan', role: 'Zaměstnanec', email: 'filip.cirhan@kpusti.cz', avatar: 'https://ui-avatars.com/api/?name=Filip+Cirhan&background=random' },
];

// Real Data - Jobs
const initialJobs: Job[] = [
  { id: 'j1', code: '10000', name: 'Režie správní', isActive: true },
  { id: 'j2', code: '10001', name: 'Režie výrobní', isActive: true },
  { id: 'j3', code: '25001', name: 'Drobné zakázky roku 2025', isActive: true },
  { id: 'j4', code: '25003', name: 'Drobné zakázky - Chládek & Tintěra', isActive: true },
  { id: 'j5', code: '25004', name: 'Základy EŽ - Ohníč', isActive: true },
  { id: 'j6', code: '25005', name: 'Horská služba - Bouřňák', isActive: true },
  { id: 'j7', code: '25007', name: 'Hrádek nad Nisou', isActive: true },
  { id: 'j8', code: '25013', name: 'Výstupní - trafostanice', isActive: true },
  { id: 'j9', code: '25014', name: 'Kovářská - rekonstrukce autodílny SÚS', isActive: true },
  { id: 'j10', code: '25016', name: 'Oprava haly na sůl Trmice', isActive: true },
  { id: 'j11', code: '25017', name: 'Propustek Solany', isActive: true },
  { id: 'j12', code: '25019', name: 'Trakční podpěry žst. Polepy', isActive: true },
  { id: 'j13', code: '25020', name: 'Bohušovice - Lovosice EŽ - základy', isActive: true },
  { id: 'j14', code: '25021', name: 'Přístavba budovy Roudnice nad Labem', isActive: true },
  { id: 'j15', code: '25022', name: 'Podbořany/MONZAS', isActive: true },
  { id: 'j16', code: '25023', name: 'Žst. Ústí nad Labem - západ', isActive: true },
  { id: 'j17', code: '25028', name: 'Základy TV Běchovice, Kolovraty', isActive: true },
  { id: 'j18', code: '25029', name: 'Hotelák', isActive: true },
  { id: 'j19', code: '25030', name: 'Rekonstrukce stropu Velké Chvojno', isActive: true },
  { id: 'j20', code: '25031', name: 'Propustek Němčany - Chotěbudice', isActive: true },
  { id: 'j21', code: '25032', name: 'Svor - lesní koupaliště', isActive: true },
  { id: 'j22', code: '25999', name: 'Poplatky za BZ 2025', isActive: true },
  { id: 'j23', code: '99999', name: 'Ostatní', isActive: true },
];

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

// Start with empty data
const initialData: TimeEntry[] = [];

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
  
  // User Session State - Default to first user (Jiří Bartoš)
  const [currentUserId, setCurrentUserId] = useState<string>('1');
  const currentUser = employees.find(e => e.id === currentUserId) || employees[0];

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  const [monthStatus, setMonthStatus] = useState<MonthStatus>(initialMonthStatus);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Manual Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  // Instead of a single editing entry, we track the date being edited
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // About Modal State
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Simulation for "Manager View" inside specific workflows (derived from role)
  const isManagerRole = currentUser.role === 'Manager';
  const [isManagerMode, setIsManagerMode] = useState(false);

  // Determine if the current view is locked for editing
  const isLocked = useMemo(() => {
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

  // 3. Entries for the currently editing date
  const entriesForEditingDate = useMemo(() => {
    if (!editingDate) return [];
    return allUserEntries.filter(e => e.date === editingDate);
  }, [allUserEntries, editingDate]);

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

  // Replaced single entry update with Daily Bulk Update
  const handleModalSubmit = (date: string, submittedEntries: TimeEntry[]) => {
    if (isLocked) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    
    setEntries(prev => {
      if (date === 'BULK_RANGE') {
        // Just append all new entries
        return [...prev, ...submittedEntries];
      } else {
        // 1. Remove ALL existing entries for this user and this date
        const otherEntries = prev.filter(e => !(e.employeeId === currentUserId && e.date === date));
        // 2. Append the new set
        return [...otherEntries, ...submittedEntries];
      }
    });
  };

  const handleDeleteEntry = (id: string) => {
    if (isLocked) {
      alert("Nelze mazat záznamy v uzamčeném výkazu.");
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditDay = (date: string) => {
    if (isLocked) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    setEditingDate(date);
    setIsEntryModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    if (isLocked) {
      alert("Nelze přidávat záznamy do uzamčeného výkazu.");
      return;
    }
    setEditingDate(new Date().toISOString().split('T')[0]); // Default to today
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
                onEdit={handleEditDay}
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
        initialDate={editingDate || undefined}
        existingEntries={entriesForEditingDate}
        currentUserId={currentUserId}
        jobs={jobs}
      />
    </div>
  );
};

export default App;
