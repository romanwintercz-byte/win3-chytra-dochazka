import React, { useState, useMemo } from 'react';
import { TimeEntry, WorkType, Employee } from '../types';
import { validateMonth } from '../services/validationService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportingModuleProps {
  entries: TimeEntry[];
  employees: Employee[];
}

const ReportingModule: React.FC<ReportingModuleProps> = ({ entries, employees }) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Helper to get employee name
  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Neznámý';
  };

  // Definition of productive work vs absences/substitutions
  const isProductiveWork = (type: WorkType) => {
    return [
      WorkType.REGULAR, 
      WorkType.OVERTIME, 
      WorkType.BUSINESS_TRIP
    ].includes(type);
  };

  // Get unique projects
  const projects = Array.from(new Set(entries.map(e => e.project)));

  // Get unique months from entries for the filter dropdown
  const availableMonths = useMemo(() => {
      const months = new Set(entries.map(e => e.date.substring(0, 7))); // Extract YYYY-MM
      return Array.from(months).sort().reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesProject = projectFilter === 'all' || entry.project === projectFilter;
      const matchesEmployee = employeeFilter === 'all' || entry.employeeId === employeeFilter;
      const matchesMonth = monthFilter === 'all' || entry.date.startsWith(monthFilter);
      return matchesProject && matchesEmployee && matchesMonth;
    });
  }, [entries, projectFilter, employeeFilter, monthFilter]);

  // Calculate Validation Issues for the current filter (only if a month is selected)
  const currentValidationIssues = useMemo(() => {
      if (monthFilter !== 'all') {
          const [year, month] = monthFilter.split('-');
          return validateMonth(filteredEntries, year, month);
      }
      return [];
  }, [filteredEntries, monthFilter]);

  const aggregatedData = useMemo<{ 
    byProject: Record<string, { total: number; regular: number; overtime: number }>; 
    byUser: Record<string, number>; 
    byType: Record<string, number>;
    totalWorked: number;
    totalRegularProductive: number;
    totalOvertime: number;
    totalAbsence: number;
    total: number; 
  }>(() => {
      const byProject: Record<string, { total: number; regular: number; overtime: number }> = {};
      const byUser: Record<string, number> = {};
      const byType: Record<string, number> = {};
      
      let totalWorked = 0;
      let totalRegularProductive = 0; // Sum of Regular + Business Trip (excluding Overtime)
      let totalOvertime = 0;          // Sum of Overtime only
      let totalAbsence = 0;
      let total = 0;

      filteredEntries.forEach(e => {
          const productive = isProductiveWork(e.type);

          // Project stats: Only count productive hours towards project budget
          if (productive) {
            if (!byProject[e.project]) {
                byProject[e.project] = { total: 0, regular: 0, overtime: 0 };
            }
            
            // Add to total project hours (sum of both)
            byProject[e.project].total += e.hours;
            
            if (e.type === WorkType.OVERTIME) {
                // Strictly Overtime column
                byProject[e.project].overtime += e.hours;
                totalOvertime += e.hours;
            } else {
                // Strictly Regular column (Regular work, Business trips etc.)
                byProject[e.project].regular += e.hours;
                totalRegularProductive += e.hours;
            }

            totalWorked += e.hours;
          } else {
            // Non-productive (Absence, Holiday, etc.)
            totalAbsence += e.hours;
          }

          // Stats by type (breakdown of absences etc)
          byType[e.type] = (byType[e.type] || 0) + e.hours;
          
          // User stats: Count everything for payroll purposes (hours reported)
          const empName = getEmployeeName(e.employeeId);
          byUser[empName] = (byUser[empName] || 0) + e.hours;
          
          total += e.hours;
      });

      return { byProject, byUser, byType, totalWorked, totalRegularProductive, totalOvertime, totalAbsence, total };
  }, [filteredEntries, employees]);

  // --- PDF Generation ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const period = monthFilter === 'all' ? 'Celá historie' : monthFilter;
    const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Všichni zaměstnanci';

    // Title
    doc.setFontSize(18);
    doc.text(`Výkaz práce: ${period}`, 14, 20);
    
    // Subheader
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Zaměstnanec: ${empName}`, 14, 30);
    doc.text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`, 14, 36);
    doc.setTextColor(0);

    // 1. Summary Table
    doc.setFontSize(14);
    doc.text("Souhrn", 14, 48);
    
    const summaryData = [
        ['Kategorie', 'Hodiny'],
        ['Běžná práce (Výkon)', aggregatedData.totalRegularProductive.toFixed(1)],
        ['Přesčasy', aggregatedData.totalOvertime.toFixed(1)],
        ['Absence / Svátky', aggregatedData.totalAbsence.toFixed(1)],
        ['CELKEM', aggregatedData.total.toFixed(1)]
    ];

    autoTable(doc, {
        startY: 52,
        head: [['Kategorie', 'Hodiny']],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    // 2. Detailed Table
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 60;
    doc.text("Detailní záznamy", 14, finalY + 15);

    const tableBody = filteredEntries
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(e => [
            new Date(e.date).toLocaleDateString('cs-CZ'),
            e.project,
            e.description,
            e.type,
            e.hours.toString()
        ]);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Datum', 'Projekt', 'Popis', 'Typ', 'Hodiny']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100] },
        columnStyles: {
            2: { cellWidth: 60 } // Description column wider
        }
    });

    // 3. Signature Section
    // @ts-ignore
    const signatureY = doc.lastAutoTable.finalY + 40;
    
    // Check if page break is needed
    if (signatureY > 270) {
        doc.addPage();
        doc.text("Podpisy", 14, 20);
        doc.line(14, 50, 80, 50);
        doc.text("Podpis zaměstnance", 14, 58);
        doc.line(110, 50, 180, 50);
        doc.text("Schválil (Nadřízený)", 110, 58);
    } else {
        doc.line(14, signatureY, 80, signatureY);
        doc.text("Podpis zaměstnance", 14, signatureY + 8);
        
        doc.line(110, signatureY, 180, signatureY);
        doc.text("Schválil (Nadřízený)", 110, signatureY + 8);
    }

    doc.save(`vykaz_prace_${empName}_${period}.pdf`);
  };

  // Generate CSV Content
  const generateSummaryCSV = () => {
    const projectLines = Object.entries(aggregatedData.byProject).map(([project, s]) => {
      const stats = s as { regular: number; overtime: number; total: number };
      return `PROJEKT,${project},${stats.regular},${stats.overtime},${stats.total}`;
    });

    const absenceLines = Object.entries(aggregatedData.byType)
      .filter(([type]) => !isProductiveWork(type as WorkType))
      .map(([type, hours]) => {
        return `ABSENCE,${type},,,-,${hours}`;
      });

    const csvContent = [
      'KATEGORIE,NÁZEV,BĚŽNÉ HODINY (bez přesčasů),PŘESČAS HODINY,CELKEM HODINY',
      ...projectLines,
      '','','','','', // Empty line separator
      'KATEGORIE,TYP ABSENCE,,,HODINY',
      ...absenceLines,
      '','','','','',
      `CELKEM,ODPRACOVÁNO (Běžná),,${aggregatedData.totalRegularProductive},`,
      `CELKEM,PŘESČASY,,,${aggregatedData.totalOvertime}`,
      `CELKEM,ABSENCE,,,${aggregatedData.totalAbsence}`,
      `CELKEM,VŠE,,,${aggregatedData.total}`
    ].join('\n');
    
    return csvContent;
  };

  // Export raw data (Detail)
  const handleExportCSV = () => {
      const headers = ['Datum', 'Zaměstnanec', 'Projekt', 'Popis', 'Typ', 'Hodiny', 'Kategorie'];
      const csvContent = [
          headers.join(','),
          ...filteredEntries.map(e => {
            const category = isProductiveWork(e.type) ? 'Výkon' : 'Absence/Náhrada';
            return `${e.date},"${getEmployeeName(e.employeeId)}","${e.project}","${e.description}",${e.type},${e.hours},${category}`;
          })
      ].join('\n');

      downloadFile(csvContent, 'vykaz_prace_detail.csv', 'text/csv;charset=utf-8;');
  };

  // Export Aggregated Summary (Payroll basis)
  const handleExportSummaryCSV = () => {
    const content = generateSummaryCSV();
    downloadFile(content, 'vykaz_prace_souhrn.csv', 'text/csv;charset=utf-8;');
  };

  // Full Backup (All Entries)
  const handleBackupData = () => {
      const backupData = JSON.stringify(entries, null, 2);
      const filename = `smartwork_backup_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(backupData, filename, 'application/json;charset=utf-8;');
  };

  const prepareEmailData = () => {
      const recipient = 'lucie.winterova@kpusti.cz';
      const period = monthFilter === 'all' ? 'Souhrn' : monthFilter;
      const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Hromadný výkaz';
      
      // Calculate validation text for email body
      const errorCount = currentValidationIssues.filter(i => i.severity === 'error').length;
      const warningCount = currentValidationIssues.filter(i => i.severity === 'warning').length;
      
      let validationText = "";
      if (monthFilter !== 'all') {
          if (errorCount === 0 && warningCount === 0) {
              validationText = "✅ Automatická kontrola: Výkaz je kompletní a bez nalezených chyb.";
          } else {
              validationText = `⚠️ Automatická kontrola upozorňuje:\n` +
                               (errorCount > 0 ? `- ${errorCount}x chybějící dny (možné díry v docházce)\n` : "") +
                               (warningCount > 0 ? `- ${warningCount}x varování (přesčasy nebo neobvyklé hodiny)\n` : "") +
                               `Prosím o kontrolu.`;
          }
      }

      const subject = `Podklady pro mzdy - ${empName} - ${period}`;
      const body = `Dobrý den,\n\nv příloze zasílám vygenerovaný výkaz práce za období ${period}.\n\n${validationText}\n\nSoubor byl automaticky stažen do mého zařízení, přikládám ho k tomuto emailu.\n\nS pozdravem,\n${empName}`;

      return { recipient, subject, body };
  };

  // Handle Trigger
  const handlePreSend = () => {
      // 1. Trigger PDF Download (It's more professional for the accountant)
      generatePDF();
      // 2. Trigger CSV Download as backup
      const content = generateSummaryCSV();
      downloadFile(content, 'vykaz_prace_data.csv', 'text/csv;charset=utf-8;');
      // 3. Open modal
      setIsEmailModalOpen(true);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
      const blob = new Blob([content], { type: type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-lg font-semibold text-gray-800">Filtry Reportu</h3>
               <button 
                  onClick={handleBackupData}
                  className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900 flex items-center gap-1 transition-colors"
                  title="Stáhnout kompletní zálohu všech dat v JSON formátu"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Zálohovat všechna data
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Období</label>
                    <select 
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">Celá historie</option>
                        {availableMonths.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                    <select 
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">Všechny projekty</option>
                        {projects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zaměstnanec</label>
                    <select 
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">Všichni zaměstnanci</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <button 
                        onClick={() => { setProjectFilter('all'); setEmployeeFilter('all'); setMonthFilter('all'); }}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Vymazat filtry
                    </button>
                </div>
            </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Běžně odpracováno (Bez přesčasů)</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-indigo-600">{aggregatedData.totalRegularProductive.toFixed(1)} h</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Přesčasy (Celkem)</p>
                <p className={`text-2xl font-bold ${aggregatedData.totalOvertime > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {aggregatedData.totalOvertime.toFixed(1)} h
                </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Celkový fond (vč. absencí)</p>
                <p className="text-2xl font-bold text-gray-900">{aggregatedData.total.toFixed(1)} h</p>
            </div>
        </div>

        {/* Communication Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h3 className="text-lg font-bold text-indigo-900">Odeslání podkladů pro mzdy</h3>
              <p className="text-sm text-indigo-700 mt-1">
                 Vygeneruje PDF s podpisovým řádkem, CSV data a předpřipraví email pro paní účetní.
              </p>
           </div>
           <button 
              onClick={handlePreSend}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-all font-medium flex items-center gap-2 whitespace-nowrap"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Vygenerovat & Odeslat
           </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 xl:col-span-2">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">Detailní výkaz ({filteredEntries.length} záznamů)</h3>
                    <div className="flex gap-2">
                         <button onClick={generatePDF} className="text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors font-medium flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            PDF Výkaz
                        </button>
                        <button onClick={handleExportSummaryCSV} className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-md hover:bg-green-100 transition-colors font-medium flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSV Souhrn
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Datum</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Projekt</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Typ</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500">Hodiny</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredEntries.map(e => (
                                <tr key={e.id} className={!isProductiveWork(e.type) ? 'bg-orange-50/30' : ''}>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{e.date}</td>
                                    <td className="px-4 py-2 font-medium text-gray-800">{e.project}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            e.type === WorkType.OVERTIME 
                                                ? 'text-orange-800 bg-orange-200' 
                                                : isProductiveWork(e.type) 
                                                    ? 'text-green-700 bg-green-100' 
                                                    : 'text-orange-700 bg-orange-100'
                                        }`}>
                                          {e.type}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-2 text-right font-mono font-bold text-base ${isProductiveWork(e.type) ? 'text-indigo-600' : 'text-orange-600'}`}>
                                        {Number(e.hours).toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-6">
                {/* Breakdown by Project with Separate Overtime Column */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Soupis hodin na zakázky</h3>
                    {Object.keys(aggregatedData.byProject).length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Žádné odpracované hodiny na projektech.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 text-xs font-medium text-gray-400 uppercase mb-1">
                                <div className="col-span-2">Projekt</div>
                                <div className="text-right" title="Běžná práce bez přesčasů">Běžná</div>
                                <div className="text-right text-orange-600">Přesčas</div>
                            </div>
                            
                            <ul className="space-y-3">
                                {Object.entries(aggregatedData.byProject).map(([project, s]) => {
                                    const stats = s as { total: number; regular: number; overtime: number };
                                    return (
                                    <li key={project} className="grid grid-cols-4 items-center border-b border-gray-50 pb-2 last:border-0 text-sm">
                                        <div className="col-span-2 font-medium text-gray-700 truncate pr-2" title={project}>{project}</div>
                                        <div className="text-right text-gray-600">{stats.regular.toFixed(1)}</div>
                                        <div className={`text-right font-bold ${stats.overtime > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                                            {stats.overtime.toFixed(1)}
                                        </div>
                                    </li>
                                )})}
                                <li className="pt-3 border-t border-gray-200 grid grid-cols-4 items-center font-bold">
                                    <span className="col-span-2">Celkem</span>
                                    <span className="text-right text-indigo-700">{aggregatedData.totalRegularProductive.toFixed(1)}</span>
                                    <span className="text-right text-orange-600">{aggregatedData.totalOvertime.toFixed(1)}</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Soupis Absencí a Náhrad</h3>
                     {aggregatedData.totalAbsence === 0 ? (
                        <p className="text-sm text-gray-400 italic">Žádné absence v tomto období.</p>
                    ) : (
                        <ul className="space-y-3">
                            {Object.entries(aggregatedData.byType)
                                .filter(([type]) => !isProductiveWork(type as WorkType))
                                .map(([type, hours]) => (
                                <li key={type} className="flex justify-between items-center">
                                    <span className="text-gray-700 text-sm">{type}</span>
                                    <span className="font-bold text-orange-600">{(hours as number).toFixed(1)} h</span>
                                </li>
                            ))}
                            <li className="pt-3 border-t border-gray-100 flex justify-between items-center font-bold text-orange-700">
                                <span>Celkem absence</span>
                                <span>{aggregatedData.totalAbsence.toFixed(1)} h</span>
                            </li>
                        </ul>
                    )}
                </div>
            </div>
        </div>

        {/* Email Selection Modal */}
        {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Soubory byly staženy</h3>
              <p className="text-sm text-gray-500 mt-1">
                PDF a CSV soubory najdete ve stažených souborech. Nyní je zašlete účetní.
              </p>
            </div>

            <div className="space-y-3">
               <button 
                 onClick={() => {
                    const { recipient, subject, body } = prepareEmailData();
                    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    setIsEmailModalOpen(false);
                 }}
                 className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all group"
               >
                 <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-md text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="text-left">
                       <div className="font-semibold text-gray-800">Výchozí email</div>
                       <div className="text-xs text-gray-500">Outlook, Apple Mail, atd.</div>
                    </div>
                 </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                 </svg>
               </button>

               <button 
                 onClick={() => {
                    const { recipient, subject, body } = prepareEmailData();
                    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(url, '_blank');
                    setIsEmailModalOpen(false);
                 }}
                 className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-red-300 transition-all group"
               >
                 <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-md text-red-600">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                           <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                    </div>
                    <div className="text-left">
                       <div className="font-semibold text-gray-800">Gmail</div>
                       <div className="text-xs text-gray-500">Otevřít v prohlížeči</div>
                    </div>
                 </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                 </svg>
               </button>

               <div className="relative">
                 <div className="absolute inset-0 flex items-center" aria-hidden="true">
                   <div className="w-full border-t border-gray-200"></div>
                 </div>
                 <div className="relative flex justify-center">
                   <span className="px-2 bg-white text-xs text-gray-500">nebo ručně</span>
                 </div>
               </div>

               <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border border-gray-200">
                  <span className="text-sm font-mono text-gray-600 select-all">lucie.winterova@kpusti.cz</span>
                  <button 
                     onClick={() => {
                        navigator.clipboard.writeText('lucie.winterova@kpusti.cz');
                        alert('Email zkopírován');
                     }}
                     className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                  >
                     Zkopírovat
                  </button>
               </div>
            </div>

            <button 
              onClick={() => setIsEmailModalOpen(false)}
              className="mt-6 w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingModule;