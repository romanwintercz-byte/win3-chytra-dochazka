export enum WorkType {
  REGULAR = 'Běžná práce',
  OVERTIME = 'Přesčas',
  VACATION = 'Dovolená',
  SICK_DAY = 'Nemocenská',
  HOLIDAY = 'Svátek',
  OCR = 'OČR (Ošetřovné)',
  DOCTOR = 'Lékař',
  BUSINESS_TRIP = 'Služební cesta',
  UNPAID_LEAVE = 'Neplacené volno',
  COMPENSATORY_LEAVE = 'Náhradní volno',
  OTHER_OBSTACLE = 'Jiná překážka',
  SIXTY_PERCENT = '60%'
}

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Employee {
  id: string;
  name: string;
  role: 'Manager' | 'Zaměstnanec';
  email: string;
  avatar: string;
}

export interface Job {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string; // Link to Employee
  date: string; // ISO string YYYY-MM-DD
  project: string; // Should match a Job name or code
  description: string;
  hours: number;
  type: WorkType;
}

export interface MonthlyStats {
  totalHours: number;
  billableHours: number;
  overtimeHours: number;
  projectDistribution: { name: string; value: number }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  isImported: boolean;
}

export interface MonthStatus {
  month: string; // YYYY-MM
  status: TimesheetStatus;
  managerComment?: string;
  submittedAt?: string;
  approvedAt?: string;
}