import { User, Booking, Image, PousadaInfo } from '../types';

// --- CONFIGURAÇÃO DA API ---
const API_BASE_URL = 'http://localhost:8787/api'; // Use a URL do seu Worker local ou de deploy

// Função auxiliar para requisições
interface RequestOptions extends RequestInit {
  authToken?: string;
}

async function apiRequest<T>(
  method: string,
  path: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }

  const config: RequestInit = {
    method,
    headers,
    ...options,
  };

  // Se o método for GET e tiver data, pode ser um query param, mas geralmente GET não tem body.
  // Para POST/PUT, o body é essencial.
  if (data && method !== 'GET') {
    // Especialmente para FormData, não queremos JSON.stringify
    if (data instanceof FormData) {
      delete headers['Content-Type']; // O navegador define o Content-Type para FormData
      config.body = data;
    } else {
      config.body = JSON.stringify(data);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const message =
      typeof errorData === 'object' && errorData !== null && 'message' in errorData
        ? (errorData as { message: string }).message
        : response.statusText;
    throw new Error(message || 'Ocorreu um erro na requisição.');
  }

  // Se a resposta for 204 No Content, não tente fazer parse do JSON
  if (response.status === 204) {
    return null as T; // Retorna null para requisições que não esperam body
  }

  // Se a resposta for JSON vazio ou não tiver body, pode dar erro ao tentar parsear
  const text = await response.text();
  return text ? JSON.parse(text) : '' as unknown as T;
}

// --- FUNÇÕES DE AUTENTICAÇÃO E USUÁRIO ---

// Agora signup também retorna o usuário e o token
export const signup = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  return apiRequest<{ user: User; token: string }>('POST', '/signup', { email, password });
};

// Retorna o token JWT e o usuário
export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  return apiRequest<{ user: User; token: string }>('POST', '/login', { email, password });
};

export const getUsers = async (authToken: string): Promise<User[]> => {
  return apiRequest<User[]>('GET', '/users', undefined, { authToken });
};

// --- FUNÇÕES DE INFORMAÇÕES DA POUSADA ---

export const getPousadaInfo = async (): Promise<PousadaInfo> => {
  return apiRequest<PousadaInfo>('GET', '/pousada-info');
};

export const updatePousadaInfo = async (info: PousadaInfo, authToken: string): Promise<PousadaInfo> => {
  return apiRequest<PousadaInfo>('PUT', '/pousada-info', info, { authToken });
};

// --- FUNÇÕES DE RESERVAS ---

export const getBookings = async (): Promise<Booking[]> => {
  return apiRequest<Booking[]>('GET', '/bookings', undefined);
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'usuario_id'>, authToken: string): Promise<Booking> => {
  return apiRequest<Booking>('POST', '/bookings', bookingData, { authToken });
};

export const updateBooking = async (id: string, bookingData: Booking, authToken: string): Promise<Booking> => {
  return apiRequest<Booking>('PUT', `/bookings/${id}`, bookingData, { authToken });
};

// --- FUNÇÕES DE IMAGENS ---

export const getImages = async (): Promise<Image[]> => {
  return apiRequest<Image[]>('GET', '/images');
};

export const uploadImage = async (file: File, authToken: string): Promise<Image> => {
  const formData = new FormData();
  formData.append('file', file);

  // apiRequest já lida com FormData removendo o Content-Type
  return apiRequest<Image>('POST', '/images', formData, { authToken });
};

export const deleteImage = async (id: string, authToken: string): Promise<void> => {
  return apiRequest<void>('DELETE', `/images/${id}`, undefined, { authToken });
};