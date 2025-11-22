
import { TimeEntry, WorkType } from '../types';
import { isHoliday, getHolidayName } from './holidayService';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  date: string;
  severity: IssueSeverity;
  message: string;
  type: 'MISSING_DAY' | 'LOW_HOURS' | 'WEEKEND_WORK' | 'HIGH_HOURS' | 'HOLIDAY_WORK';
}

export const validateMonth = (entries: TimeEntry[], yearStr: string, monthStr: string): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Get number of days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = getHolidayName(dateStr);
    const isPublicHoliday = !!holidayName;

    // Get entries for this day
    const dayEntries = entries.filter(e => e.date === dateStr);
    const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

    // 1. Check for Missing Data (Working days only, excluding Holidays)
    if (!isWeekend && !isPublicHoliday && dayEntries.length === 0) {
      // Check if current date is in the future relative to today (don't error on future days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateObj <= today) {
        issues.push({
          date: dateStr,
          severity: 'error',
          message: 'Chybí výkaz pro pracovní den.',
          type: 'MISSING_DAY'
        });
      }
      continue; // Skip other checks if missing
    }

    // 2. Check for Low Hours (Working days only, excluding Holidays)
    if (!isWeekend && !isPublicHoliday && totalHours > 0 && totalHours < 8) {
      issues.push({
        date: dateStr,
        severity: 'warning',
        message: `Podlimitní stav: vykázáno pouze ${totalHours}h (standard je 8h).`,
        type: 'LOW_HOURS'
      });
    }

    // 3. Check for High Hours
    if (totalHours > 12) {
      issues.push({
        date: dateStr,
        severity: 'warning',
        message: `Vysoký počet hodin: ${totalHours}h. Zkontrolujte legislativní limity.`,
        type: 'HIGH_HOURS'
      });
    }

    // 4. Info about Weekend Work
    if (isWeekend && totalHours > 0) {
      issues.push({
        date: dateStr,
        severity: 'info',
        message: 'Práce o víkendu.',
        type: 'WEEKEND_WORK'
      });
    }

    // 5. Check for Holiday Work or correct Holiday entry
    if (isPublicHoliday) {
        if (totalHours > 0) {
            // If they logged work, warn them to check if it's intentional
            const hasHolidayType = dayEntries.some(e => e.type === WorkType.HOLIDAY);
            if (!hasHolidayType) {
                 issues.push({
                    date: dateStr,
                    severity: 'warning',
                    message: `Práce ve svátek (${holidayName}). Ujistěte se, že jde o schválený přesčas.`,
                    type: 'HOLIDAY_WORK'
                });
            }
        } 
        // Note: If no entry on holiday, it's fine, standard scenario.
    }
  }

  return issues;
};

export const getIssueColor = (severity: IssueSeverity) => {
  switch (severity) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};
