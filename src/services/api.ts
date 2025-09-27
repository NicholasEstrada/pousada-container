// api.ts
import { supabase } from '../supabaseClient'; // Importe o cliente inicializado
import { User, Booking, Image, PousadaInfo } from '../types';

// O cliente Supabase gerencia o token automaticamente após o login.

// --- FUNÇÕES DE AUTENTICAÇÃO E USUÁRIO ---

// O signup agora também faz o login automaticamente
export const signup = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('Não foi possível criar o usuário.');
  
  // A role será definida pelo trigger no banco de dados.
  // O Supabase não retorna a role customizada diretamente no objeto 'user' do auth.
  // Você pode buscar o perfil se precisar da role imediatamente.
  return {
    user: { id: data.user.id, email: data.user.email!, role: 'cliente' }, // Role padrão no front-end
    token: data.session.access_token,
  };
};

export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('Login falhou.');

  // Para pegar a role, precisamos buscar na tabela 'profiles'
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw new Error(profileError.message);

  return {
    user: { id: data.user.id, email: data.user.email!, role: profileData.role as User['role'] },
    token: data.session.access_token,
  };
};

// Admin-only: busca todos os usuários
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('profiles').select('id, email, role');
  if (error) throw new Error(error.message);
  return data;
};

// --- FUNÇÕES DE INFORMAÇÕES DA POUSADA ---

export const getPousadaInfo = async (): Promise<PousadaInfo> => {
  // Buscamos a descrição e as opções em paralelo
  const [infoRes, optionsRes] = await Promise.all([
    supabase.from('pousada_info').select('description').single(),
    supabase.from('pousada_options').select('id, label, price')
  ]);

  if (infoRes.error) throw new Error(infoRes.error.message);
  if (optionsRes.error) throw new Error(optionsRes.error.message);

  return {
    description: infoRes.data.description,
    options: optionsRes.data,
  };
};

// Admin-only: atualiza informações. Note que não passamos mais o token.
export const updatePousadaInfo = async (info: PousadaInfo): Promise<PousadaInfo> => {
    // Transações são mais seguras para múltiplas escritas, mas para simplificar:
    const { error: descError } = await supabase
        .from('pousada_info')
        .update({ description: info.description })
        .eq('id', 1); // Supondo que só haverá uma linha

    if (descError) throw new Error(descError.message);
    
    // Para opções, é mais complexo (upsert).
    const { error: optError } = await supabase.from('pousada_options').upsert(info.options);
    if(optError) throw new Error(optError.message);

    return info;
};

// --- FUNÇÕES DE RESERVAS ---

// RLS garante que o usuário só veja suas próprias reservas (ou todas se for admin)
export const getBookings = async (): Promise<Booking[]> => {
  // A MÁGICA ESTÁ AQUI, NA STRING DO .select()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      profiles (
        email,
        phone_number
      )
    `);

  if (error) {
    console.error('Erro ao buscar reservas com perfis:', error);
    throw new Error(error.message);
  }
  
  // O Supabase vai retornar um objeto aninhado.
  // Precisamos "achatar" ele para se encaixar no nosso tipo `Booking` existente, se necessário.
  // Vamos ajustar o tipo `Booking` para acomodar isso.
  return data;
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'usuario_id' | 'profiles'>): Promise<Booking> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const newBooking = { ...bookingData, usuario_id: user.id };
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(newBooking)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
};

export const updateBooking = async (id: string, bookingData: Booking): Promise<Booking> => {
  // Remove campos que não devem ser atualizados para evitar erros
  const { id: bookingId, usuario_id, ...updateData } = bookingData;

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData) // Atualiza apenas os dados relevantes
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteBooking = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

// --- FUNÇÕES DE IMAGENS ---

export const getImages = async (): Promise<Image[]> => {
    const { data, error } = await supabase.storage.from('images').list();
    if (error) throw new Error(error.message);

    const images = data.map(file => {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(file.name);
        return {
            id: file.name,
            url: publicUrl,
            alt: file.name
        };
    });
    return images;
};

export const uploadImage = async (file: File): Promise<Image> => {
    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
    
    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

    return { id: fileName, url: publicUrl, alt: file.name };
};

export const deleteImage = async (id: string): Promise<void> => {
    const { error } = await supabase.storage.from('images').remove([id]);
    if (error) throw new Error(error.message);
};

export const updateUserProfile = async (updates: { phone_number?: string; [key: string]: any }): Promise<void> => {
  // Pega o usuário logado para saber qual perfil atualizar.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id); // Garante que ele só pode atualizar o próprio perfil.

  if (error) {
    throw new Error(error.message);
  }
};