import React, { useState, useRef } from 'react';
import { parseNaturalLanguageEntry, transcribeAudio } from '../services/geminiService';
import { TimeEntry, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SmartInputProps {
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
  availableJobs: Job[];
  onManualEntry: () => void;
}

const SmartInput: React.FC<SmartInputProps> = ({ onEntriesAdded, currentUserId, availableJobs, onManualEntry }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSmartSubmit = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const parsedItems = await parseNaturalLanguageEntry(inputText, today, availableJobs);

      const newEntries: TimeEntry[] = parsedItems.map(item => ({
        id: uuidv4(),
        employeeId: currentUserId,
        date: item.date || today,
        project: item.project || 'General',
        description: item.description || 'Práce',
        hours: item.hours || 0,
        type: item.type || Object.values(item.type || {})[0] // Fallback safety
      } as TimeEntry));

      onEntriesAdded(newEntries);
      setInputText('');
    } catch (err) {
      setError("Nepodařilo se zpracovat text. Zkuste to prosím znovu nebo zadejte data ručně.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Nelze přistupovat k mikrofonu. Zkontrolujte oprávnění.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true); // Show processing while transcribing
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      const transcription = await transcribeAudio(base64Audio, audioBlob.type);
      if (transcription) {
        setInputText(prev => (prev ? `${prev} ${transcription}` : transcription));
      }
    } catch (err) {
      setError("Nepodařilo se přepsat audio. Zkuste to prosím znovu.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          AI Rychlé zadání
        </h3>
        <button 
          onClick={onManualEntry}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Zadat ručně
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Napište nebo nadiktujte, co jste dělali. AI to automaticky roztřídí.
        <br />
        <i>Např.: "Včera jsem 4 hodiny programoval API pro Web Redesign."</i>
      </p>
      
      <div className="flex gap-2 flex-col sm:flex-row items-stretch">
        <div className="relative flex-1">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Zde popište svou práci nebo použijte mikrofon..."
            className="w-full h-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] resize-y"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSmartSubmit();
              }
            }}
          />
          {/* Microphone Button inside the textarea area for easy access */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing && !isRecording}
            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' 
                : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'
            }`}
            title={isRecording ? "Zastavit nahrávání" : "Nahrávat hlasem"}
          >
            {isRecording ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
               </svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 2.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>
        </div>

        <button
          onClick={handleSmartSubmit}
          disabled={isProcessing || !inputText.trim()}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center min-w-[120px] ${
            isProcessing || !inputText.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Zpracování
            </span>
          ) : (
            'Přidat'
          )}
        </button>
      </div>
      {error && (
        <div className="mt-3 text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
          {error}
        </div>
      )}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium animate-pulse">
           <div className="w-2 h-2 bg-red-600 rounded-full"></div>
           Nahrávání probíhá... (Klikněte na mikrofon pro ukončení)
        </div>
      )}
    </div>
  );
};

export default SmartInput;