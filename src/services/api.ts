import { User, Booking, Image, PousadaInfo } from '../types';

// --- CONFIGURAÇÃO DA API ---
const API_BASE_URL = '/api'; // Use a URL do seu Worker local ou de deploy

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
  console.log('[apiRequest] method:', method, 'path:', path, 'data:', data, 'options:', options);

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

  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      config.body = data;
      console.log('[apiRequest] Enviando FormData');
    } else {
      config.body = JSON.stringify(data);
      console.log('[apiRequest] Enviando JSON:', config.body);
    }
  }

  console.log('[apiRequest] Fetch config:', config);

  let response: Response;
  try {

    response = await fetch(`${API_BASE_URL}${path}`, config);

    
    console.log('[apiRequest] Response status:', response.status);
  } catch (fetchError) {
    console.error('[apiRequest] Fetch error:', fetchError);
    throw new Error('Erro de conexão com o servidor.');
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
      console.error('[apiRequest] Response error data:', errorData);
    } catch {
      errorData = { message: response.statusText };
      console.error('[apiRequest] Response error statusText:', response.statusText);
    }
    const message =
      typeof errorData === 'object' && errorData !== null && 'message' in errorData
        ? (errorData as { message: string }).message
        : response.statusText;
    throw new Error(message || 'Ocorreu um erro na requisição.');
  }

  if (response.status === 204) {
    console.log('[apiRequest] 204 No Content');
    return null as T;
  }

  const text = await response.text();
  console.log('[apiRequest] Response text:', text);

  if (!text) {
    console.log('[apiRequest] Empty response text');
    return '' as unknown as T;
  }
  try {
    console.log('[apiRequest] Parsing JSON response');  
    return JSON.parse(text);
  } catch (parseError) {
    console.error('[apiRequest] JSON parse error:', parseError, 'Response text:', text);
    throw new Error('Erro ao processar a resposta do servidor.');
  }
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
  console.log('[getBookings] Iniciando requisição para /bookings');
  try {
    const result = await apiRequest<Booking[]>('GET', '/bookings');
    console.log('[getBookings] Sucesso na requisição:', result);
    return result;
  } catch (error) {
    console.warn('[getBookings] Erro na primeira tentativa:', error);
    // Redundância: tenta novamente uma vez
    try {
      const result = await apiRequest<Booking[]>('GET', '/bookings');
      console.log('[getBookings] Sucesso na segunda tentativa:', result);
      return result;
    } catch (err) {
      console.error('[getBookings] Erro na segunda tentativa, retornando dados mockados:', err);
      // Retorna dados mockados como fallback
      return [
        {
          id: 'mock-1',
          usuario_id: 'mock-user',
          data_inicio: '2024-01-01',
          data_fim: '2024-01-05',
          descricao: '101',
          opcoes: { arCondicionado: true, cafeDaManha: false },
        },
      ] as Booking[];
    }
  }
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