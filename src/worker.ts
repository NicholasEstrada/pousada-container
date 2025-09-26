import { Router } from 'itty-router';
import { sign, verify, decode } from '@tsndr/cloudflare-worker-jwt';
import { compare, hash } from 'bcryptjs';
import { User, Booking, Image, PousadaInfo, UserRole } from './types';

// Constants
const ROLES = {
  CLIENTE: 'cliente' as UserRole,
  ADMIN: 'admin' as UserRole
};

interface Env {
  USERS_KV: KVNamespace;
  BOOKINGS_KV: KVNamespace;
  POUSADA_INFO_KV: KVNamespace;
  IMAGES_R2: R2Bucket;
  JWT_SECRET: string;
  ASSETS?: Fetcher;
}

interface RequestWithUser extends Request {
  user?: User;
  params?: any;
}

const router = Router();

// Middleware de Autenticação
const authenticate = async (request: RequestWithUser, env: Env): Promise<Response | void> => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Token não fornecido', { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) return new Response('Token inválido', { status: 401 });
    
    const decoded = decode(token);
    request.user = decoded.payload as User;
  } catch (error) {
    return new Response('Erro de autenticação', { status: 401 });
  }
};

// Middleware de Autorização
const authorize = (allowedRoles: UserRole[]) => {
  return (request: RequestWithUser): Response | void => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return new Response('Permissão insuficiente', { status: 403 });
    }
  };
};

// Helper para aplicar middlewares
const withAuth = (roles?: UserRole[]) => {
  return async (request: RequestWithUser, env: Env) => {
    const authResult = await authenticate(request, env);
    if (authResult) return authResult;
    
    if (roles && roles.length > 0) {
      const authzResult = authorize(roles)(request);
      if (authzResult) return authzResult;
    }
  };
};

// --- ROTAS DE API ---

// Health check
router.get('/api/health', async () => {
  return new Response(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Auth routes
router.post('/api/signup', async (request: RequestWithUser, env: Env) => {
  try {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return new Response('Email e senha obrigatórios', { status: 400 });
    }

    const existing = await env.USERS_KV.get(email);
    if (existing) return new Response('Usuário já existe', { status: 409 });

    const id = crypto.randomUUID();
    const hashedPassword = await hash(password, 10);

    const newUser: User = {
      id,
      email,
      password: hashedPassword,
      role: ROLES.CLIENTE,
    };

    await env.USERS_KV.put(email, JSON.stringify(newUser));

    const payload = {
      sub: newUser.email,
      role: newUser.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await sign(payload, env.JWT_SECRET);

    return new Response(JSON.stringify({
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

router.post('/api/login', async (request: RequestWithUser, env: Env) => {
  try {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return new Response('Email e senha obrigatórios', { status: 400 });
    }

    const userString = await env.USERS_KV.get(email);
    if (!userString) return new Response('Credenciais inválidas', { status: 401 });

    const user: User = JSON.parse(userString);

    if (!user.password || !(await compare(password, user.password))) {
      return new Response('Credenciais inválidas', { status: 401 });
    }

    const payload = {
      sub: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    };

    const token = await sign(payload, env.JWT_SECRET);

    return new Response(JSON.stringify({ 
      token, 
      user: { id: user.id, email: user.email, role: user.role } 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Pousada info (pública)
router.get('/api/pousada-info', async (request: RequestWithUser, env: Env) => {
  try {
    const infoString = await env.POUSADA_INFO_KV.get('pousada_info');
    
    if (!infoString) {
      const defaultInfo: PousadaInfo = {
        description: 'Bem-vindo à Pousada Oásis, um refúgio de paz e tranquilidade em meio à natureza.',
        options: [
          { id: 'cafe_da_manha', label: 'Café da Manhã Incluso', price: 30 },
          { id: 'piscina', label: 'Acesso à Piscina', price: 50 },
          { id: 'roupa_de_cama', label: 'Roupa de Cama Extra', price: 20 },
        ],
      };
      await env.POUSADA_INFO_KV.put('pousada_info', JSON.stringify(defaultInfo));
      return new Response(JSON.stringify(defaultInfo), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(infoString, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Pousada info error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Pousada info (admin apenas)
router.put('/api/pousada-info', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth([ROLES.ADMIN])(request, env);
    if (authResult) return authResult;

    const info = await request.json() as PousadaInfo;
    await env.POUSADA_INFO_KV.put('pousada_info', JSON.stringify(info));
    
    return new Response(JSON.stringify(info), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update pousada info error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Bookings
router.get('/api/bookings', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth()(request, env);
    if (authResult) return authResult;

    if (!request.user) return new Response('Não autorizado', { status: 401 });

    const { keys } = await env.BOOKINGS_KV.list();
    const bookingsPromises = keys.map(async (key) => {
      const bookingString = await env.BOOKINGS_KV.get(key.name);
      return bookingString ? JSON.parse(bookingString) as Booking : null;
    });

    let bookings = (await Promise.all(bookingsPromises)).filter(Boolean) as Booking[];

    if (request.user.role === ROLES.CLIENTE) {
      bookings = bookings.filter(b => b.usuario_id === request.user!.id);
    }

    return new Response(JSON.stringify(bookings), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

router.post('/api/bookings', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth([ROLES.CLIENTE, ROLES.ADMIN])(request, env);
    if (authResult) return authResult;

    if (!request.user) return new Response('Não autorizado', { status: 401 });

    const bookingData = await request.json() as Omit<Booking, 'id' | 'usuario_id'>;
    const newBooking: Booking = {
      ...bookingData,
      id: crypto.randomUUID(),
      usuario_id: request.user.id,
    };

    await env.BOOKINGS_KV.put(newBooking.id, JSON.stringify(newBooking));
    
    return new Response(JSON.stringify(newBooking), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Images (público - apenas leitura)
router.get('/api/images', async (request: RequestWithUser, env: Env) => {
  try {
    const listed = await env.IMAGES_R2.list();
    const images: Image[] = listed.objects.map(obj => ({
      id: obj.key,
      url: `/api/images/${obj.key}`, // URL relativa - será servida pela rota abaixo
      alt: obj.key.split('.')[0],
    }));

    return new Response(JSON.stringify(images), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get images error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Servir imagens diretamente do R2
router.get('/api/images/:imageId', async (request: RequestWithUser, env: Env) => {
  try {
    const imageId = (request as any).params?.imageId;
    if (!imageId) return new Response('ID da imagem obrigatório', { status: 400 });

    const object = await env.IMAGES_R2.get(imageId);
    if (!object) return new Response('Imagem não encontrada', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get image error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Upload de imagens (admin apenas)
router.post('/api/images', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth([ROLES.ADMIN])(request, env);
    if (authResult) return authResult;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return new Response('Arquivo obrigatório', { status: 400 });

    const filename = `${crypto.randomUUID()}-${file.name}`;
    await env.IMAGES_R2.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const newImage: Image = {
      id: filename,
      url: `/api/images/${filename}`,
      alt: file.name,
    };

    return new Response(JSON.stringify(newImage), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Delete image (admin apenas)
router.delete('/api/images/:imageId', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth([ROLES.ADMIN])(request, env);
    if (authResult) return authResult;

    const imageId = (request as any).params?.imageId;
    if (!imageId) return new Response('ID obrigatório', { status: 400 });

    await env.IMAGES_R2.delete(imageId);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete image error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Users (admin apenas)
router.get('/api/users', async (request: RequestWithUser, env: Env) => {
  try {
    const authResult = await withAuth([ROLES.ADMIN])(request, env);
    if (authResult) return authResult;

    const { keys } = await env.USERS_KV.list();
    const usersPromises = keys.map(async (key) => {
      const userString = await env.USERS_KV.get(key.name);
      if (userString) {
        const user = JSON.parse(userString);
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    });

    const users = (await Promise.all(usersPromises)).filter(Boolean);
    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return new Response('Erro interno', { status: 500 });
  }
});

// Handler principal - ESTRUTURA CORRIGIDA PARA SPA + API
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Rotas de API - tem prioridade
    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await router.handle(request, env, ctx);
        return response || new Response('Rota API não encontrada', { status: 404 });
      } catch (error) {
        console.error('API route error:', error);
        return new Response('Erro interno da API', { status: 500 });
      }
    }

    // Servir arquivos estáticos do React (SPA)
    if (env.ASSETS) {
      try {
        // Tenta servir o arquivo solicitado
        let pathname = url.pathname;
        if (pathname === '/') pathname = '/index.html';
        
        const assetResponse = await env.ASSETS.fetch(new Request(new URL(pathname, url.origin)));
        
        // Se encontrou o arquivo, retorna
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
        
        // Para rotas do React Router, serve o index.html
        if (!pathname.includes('.')) { // Não tem extensão de arquivo
          return await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
        }
      } catch (error) {
        console.error('Asset serving error:', error);
      }
    }

    // Fallback para SPA - qualquer rota não-API serve o index.html
    if (env.ASSETS) {
      return await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
    }

    return new Response('Not Found', { status: 404 });
  },
};