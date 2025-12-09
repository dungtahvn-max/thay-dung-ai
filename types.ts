export type Role = 'user' | 'model';

export interface User {
  name: string;
  role: 'student' | 'teacher';
  grade?: string; // e.g., "Lớp 5", "Lớp 12"
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  image?: string; // Base64 string
  isError?: boolean;
}

export enum GradeLevel {
  Lop1 = "Lớp 1",
  Lop2 = "Lớp 2",
  Lop3 = "Lớp 3",
  Lop4 = "Lớp 4",
  Lop5 = "Lớp 5",
  Lop6 = "Lớp 6",
  Lop7 = "Lớp 7",
  Lop8 = "Lớp 8",
  Lop9 = "Lớp 9",
  Lop10 = "Lớp 10",
  Lop11 = "Lớp 11",
  Lop12 = "Lớp 12",
}