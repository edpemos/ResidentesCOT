export type Role = 'admin' | 'reader';

export interface User {
  uid: string;
  email: string;
  role: Role;
  name?: string;
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

// Unidades disponibles
export interface Unit {
  id: string;
  name: string;
  color: string; // Tailwind class
}

export type RotationType = 'interna-cot' | 'interna-hospital' | 'externa';

export interface Rotation {
  id: string;
  residentId: string;
  month: number; // 0-11
  year: number;
  unitId: string;
  isVacation: boolean;
  type?: RotationType;
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
}
