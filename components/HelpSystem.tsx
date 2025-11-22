import React, { useState, useRef, useEffect } from 'react';
import { getSmartHelpResponse } from '../services/geminiService';

const HelpSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'chat'>('guide');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Ahoj! Jsem tvůj průvodce aplikací SmartWork. S čím potřebuješ poradit?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const aiResponse = await getSmartHelpResponse(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Omlouvám se, došlo k chybě připojení.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    "Jak zadat dovolenou?",
    "Jak exportovat PDF?",
    "Jak zkopírovat záznam?",
    "Co když jsem zapomněl heslo?"
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 flex items-center justify-center"
        title="Nápověda a Průvodce"
      >
        {isOpen ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        )}
      </button>

      {/* Main Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[90vw] max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] animate-fade-in overflow-hidden">
          
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              SmartWork Nápověda
            </h3>
            <div className="flex mt-3 bg-indigo-800/50 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'guide' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-100 hover:text-white'}`}
              >
                Průvodce
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-100 hover:text-white'}`}
              >
                AI Asistent
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            
            {/* GUIDE TAB */}
            {activeTab === 'guide' && (
              <div className="p-4 space-y-3">
                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>🚀 Jak začít?</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Vítejte ve SmartWork! Váš hlavní úkol je evidovat denní práci.</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Použijte <strong>AI Rychlé zadání</strong> pro napsání nebo nadiktování práce (např. "Včera 8h administrativa").</li>
                      <li>Nebo použijte tlačítko <strong>"Zadat ručně"</strong> pro klasický formulář.</li>
                    </ul>
                  </div>
                </details>

                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>📅 Hromadné zadávání</span>
                    <span className="transition group-open:rotate-180">
                       <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Potřebujete zadat celý týden najednou?</p>
                    <ol className="list-decimal pl-4 mt-2 space-y-1">
                      <li>Klikněte na <strong>Zadat ručně</strong>.</li>
                      <li>Zaškrtněte <strong>Více dní (Hromadně)</strong>.</li>
                      <li>Vyberte datum Od a Do.</li>
                      <li>Aplikace automaticky vytvoří záznamy a přeskočí víkendy.</li>
                    </ol>
                  </div>
                </details>

                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>✅ Uzavření měsíce</span>
                    <span className="transition group-open:rotate-180">
                       <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Na konci měsíce:</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Zkontrolujte, zda nemáte v kalendáři chyby (červená varování).</li>
                      <li>Přejděte do záložky <strong>Reporty</strong> a stáhněte si PDF.</li>
                      <li>Klikněte na <strong>Odeslat ke schválení</strong> v horní liště.</li>
                    </ul>
                  </div>
                </details>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                  <strong>Tip:</strong> Využívejte mikrofon u AI zadání na mobilu pro rychlé diktování cestou z práce!
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                     <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                     </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length < 3 && (
                  <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                    {quickQuestions.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => { setChatInput(q); handleSendMessage(); }}
                        className="whitespace-nowrap text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Zeptej se..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isTyping}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HelpSystem;
