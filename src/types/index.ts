export type Role = 'admin' | 'reader';

export interface User {
  uid: string;
  email: string;
  role: Role;
  name?: string;
}

export type DutyType = 'guardia' | 'tarde' | 'libre' | 'saliente' | 'curso' | 'manana' | 'vacaciones' | 'no-saliente' | 'saliente-manual' | 'rucot' | 'tarde-especial' | 'vacaciones-pendiente' | 'rucot-guardia';

export interface Duty {
  id: string;
  residentId: string;
  date: string; // Format: 'YYYY-MM-DD'
  type: DutyType;
  notes?: string;
  hasTarde?: boolean;
  hasTardeEspecial?: boolean;
}

export type ResidentYear = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'Graduado';

export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  year: ResidentYear; // Calculado dinámicamente
}

export type UnitType = 'interna' | 'interna-hjsd' | 'externa';

// Unidades disponibles
export interface Unit {
  id: string;
  name: string;
  color: string; // Tailwind class
  type?: UnitType;
}

export interface Rotation {
  id: string;
  residentId: string;
  month: number; // 0-11
  year: number;
  unitId: string;
  isVacation: boolean;
  status?: 'confirmed' | 'pending' | null;
  customName?: string | null;
}

export interface Session {
  id: string;
  date: string; // ISO date string
  topic: string;
  residentId: string;
  tutorId: string;
  status: 'Pendiente' | 'Impartida' | 'Aplazada';
  articleId?: string;
}

export interface Article {
  id: string;
  title: string;
  specialty: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  authors?: string;
  publishedAt?: string;
}

export interface LiquidationSummaryItem {
  residentId: string;
  residentName: string;
  guardsCount: number;
  afternoonsCount: number;
  freeDaysCount: number;
  vacationsCount: number;
  rucotCount: number;
}

export interface Liquidation {
  id: string; // YYYY-MM
  year: number;
  monthIndex: number;
  liquidatedAt: string;
  liquidatedBy: string;
  summary: LiquidationSummaryItem[];
  dutiesSnapshot: Duty[];
}
