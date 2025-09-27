
export type UserRole = 'cliente' | 'admin';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface Booking {
  id: string;
  usuario_id: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  descricao: string;
  opcoes: { [key: string]: boolean };
  profiles: {
    email: string;
    phone_number: string | null;
  } | null;
}

export interface Image {
  id: string;
  url: string;
  alt: string;
}

export interface PousadaInfo {
    description: string;
    options: { id: string; label: string; price: number }[];
}
