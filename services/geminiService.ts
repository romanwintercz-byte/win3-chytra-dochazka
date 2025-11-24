import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WorkType, TimeEntry, CalendarEvent, Job } from "../types";

const apiKey = process.env.API_KEY || '';

// Debugging helper pro produkci (klíč se v logu neukáže celý, jen zda existuje)
if (!apiKey) {
  console.error("⚠️ CRITICAL: Gemini API Key is missing! Make sure 'API_KEY' is set in Vercel Environment Variables.");
} else {
  console.log("✅ Gemini API Key loaded successfully.");
}

const ai = new GoogleGenAI({ apiKey });

// Schema for parsing natural language to Time Entries
const timeEntrySchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Date in YYYY-MM-DD format. If relative date (today, yesterday) is used, calculate based on reference date." },
      project: { type: Type.STRING, description: "Exact name of the project/job from the provided list. LEAVE EMPTY/NULL if type is NOT Regular Work or Overtime." },
      description: { type: Type.STRING, description: "Short description of the task." },
      hours: { type: Type.NUMBER, description: "Number of hours worked." },
      type: { 
        type: Type.STRING, 
        enum: [
          WorkType.REGULAR,
          WorkType.OVERTIME,
          WorkType.VACATION,
          WorkType.SICK_DAY,
          WorkType.HOLIDAY,
          WorkType.OCR,
          WorkType.DOCTOR,
          WorkType.BUSINESS_TRIP,
          WorkType.UNPAID_LEAVE,
          WorkType.COMPENSATORY_LEAVE,
          WorkType.OTHER_OBSTACLE,
          WorkType.SIXTY_PERCENT
        ],
        description: "Type of work entry."
      }
    },
    required: ["date", "hours", "type"]
  }
};

export const parseNaturalLanguageEntry = async (text: string, referenceDate: string, availableJobs: Job[]): Promise<Partial<TimeEntry>[]> => {
  try {
    const jobList = availableJobs.map(j => `${j.name} (${j.code})`).join(", ");
    
    const prompt = `
      Jsi asistent pro mzdové účetnictví. Převeď následující textový popis práce na strukturovaná data pro výkaz.
      Dnešní referenční datum je: ${referenceDate}. Pokud uživatel neuvede rok, použij rok z referenčního data.
      Pokud uživatel neuvede typ práce, předpokládej 'Běžná práce'.
      
      Dostupné Zakázky (Projects): [${jobList}]
      
      PRAVIDLA PRO PŘIŘAZENÍ ZAKÁZKY:
      1. Pokud je typ práce 'Běžná práce' nebo 'Přesčas', MUSÍŠ přiřadit zakázku ze seznamu (nebo 'Ostatní', pokud nenajdeš shodu).
      2. Pokud je typ práce cokoliv jiného (Dovolená, Lékař, Svátek, OČR atd.), pole 'project' MUSÍ zůstat prázdné nebo null. K absencím se zakázky nepřiřazují.
      
      Vstupní text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: timeEntrySchema,
        systemInstruction: "Vždy vracej pouze validní JSON pole."
      }
    });

    const rawData = response.text;
    if (!rawData) return [];
    
    return JSON.parse(rawData) as Partial<TimeEntry>[];
  } catch (error) {
    console.error("Error parsing entry with Gemini:", error);
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Přepiš tuto audio nahrávku doslovně do textu. Oprav drobné gramatické chyby, ale zachovej význam. Vrať pouze čistý text, žádné úvody ani komentáře."
          }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Nepodařilo se přepsat audio.");
  }
};

export const analyzeTimesheet = async (entries: TimeEntry[]): Promise<string> => {
  try {
    // Simplify data for analysis to save tokens
    const simpleEntries = entries.map(e => ({
      date: e.date,
      project: e.project,
      hours: e.hours,
      type: e.type
    }));
    
    const entriesJson = JSON.stringify(simpleEntries);
    const prompt = `
      Analyzuj tento měsíční výkaz práce pro mzdovou účetní a manažera.
      Data: ${entriesJson}
      
      Vytvoř krátké shrnutí v češtině (max 3 odstavce), které obsahuje:
      1. Celkové vytížení a případné anomálie (příliš mnoho přesčasů, nevyvážené projekty).
      2. Upozornění na chybějící dny nebo podezřelé záznamy, pokud existují.
      3. Pozitivní nebo neutrální zhodnocení měsíce.
      
      Formátuj to jako profesionální email pro nadřízeného.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Nepodařilo se vygenerovat analýzu.";
  } catch (error) {
    console.error("Error analyzing timesheet:", error);
    return "Chyba při generování analýzy.";
  }
};

export const mapCalendarEventsToEntries = async (events: CalendarEvent[], existingProjects: string[]): Promise<Partial<TimeEntry>[]> => {
    try {
        const eventsJson = JSON.stringify(events.map(e => ({ title: e.title, start: e.start, end: e.end })));
        const projectsJson = JSON.stringify(existingProjects);

        const prompt = `
          Jsi inteligentní asistent. Máš seznam událostí z kalendáře a seznam existujících projektů.
          
          Existující projekty: ${projectsJson}
          Události z kalendáře: ${eventsJson}
          
          Tvým úkolem je převést události na TimeEntry objekty.
          1. Spočítej trvání (hours) na základě start a end.
          2. Odhadni nejlepší 'project' z názvu události. Pokud se název podobá existujícímu projektu, použij ho. Jinak vymysli vhodný název (např. 'Meeting', 'General').
          3. 'description' bude název události.
          4. 'date' je datum začátku události (YYYY-MM-DD).
          5. 'type' je obvykle 'Běžná práce'.
          
          Vrať JSON pole.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: timeEntrySchema,
            }
        });

        const rawData = response.text;
        if (!rawData) return [];
        return JSON.parse(rawData) as Partial<TimeEntry>[];

    } catch (error) {
        console.error("Error mapping calendar events:", error);
        return [];
    }
};

export const getSmartHelpResponse = async (userQuestion: string): Promise<string> => {
    try {
        const prompt = `
          Jsi expertní podpora pro aplikaci "SmartWork". Odpovídej stručně, česky a nápomocně.
          
          Znalostní báze aplikace SmartWork:
          1. **Zadávání práce (NOVÉ):**
             - Aplikace podporuje **Denní editor**: Na jeden den můžete zadat více položek (např. 4h Projekt A + 4h Lékař).
             - Kliknutím na konkrétní den v tabulce otevřete editor, kde si den "poskládáte".
             - **Hlasové zadání je chytré**: Stačí říct "Včera 4 hodiny e-shop a 2 hodiny lékař" a AI to sama rozdělí na dva řádky.
             - Lze zadat i hromadně pro více dní (v editoru zaškrtnout "Více dní").
             - **DŮLEŽITÉ:** Zakázky se zadávají POUZE u "Běžné práce" a "Přesčasů". U dovolené, lékaře atd. se zakázka nevyplňuje.
          
          2. **Reporty a Export:**
             - V sekci "Reporty" lze generovat PDF (s podpisem) a CSV.
             - Aplikace umí připravit email pro účetní.
          
          3. **Validace a Schvalování:**
             - Aplikace kontroluje svátky, víkendy a chybějící dny.
             - Hlídá součet hodin na den (upozorní, když není 8h).
             - Po odeslání se měsíc uzamkne pro úpravy.
          
          4. **Typy práce:**
             - Podporujeme: Běžná práce, Přesčas, Dovolená, Svátek, Lékař, OČR, Služební cesta atd.
             
          Dotaz uživatele: "${userQuestion}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Omlouvám se, ale na tento dotaz teď neumím odpovědět.";
    } catch (error) {
        console.error("Error getting help response:", error);
        return "Došlo k chybě při komunikaci s asistentem.";
    }
};
