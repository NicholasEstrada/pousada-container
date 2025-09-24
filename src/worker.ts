import { Router } from 'itty-router';
//import * as jwt from '@tsndr/cloudflare-worker-jwt';
import { sign, verify, decode } from '@tsndr/cloudflare-worker-jwt';
// import { hash, verify } from 'argon2'; // Usaremos Argon2, mais moderno que bcrypt e ideal para Workers
// import * as bcrypt from 'bcryptjs';
import {compare, hash} from 'bcryptjs';
import { User, Booking, Image, PousadaInfo, UserRole } from './types';
import { ROLES } from './constants';

interface Env {
  USERS_KV: KVNamespace;
  BOOKINGS_KV: KVNamespace;
  POUSADA_INFO_KV: KVNamespace;
  IMAGES_R2: R2Bucket;
  JWT_SECRET: string;
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

const router = Router();

// Middleware de Autenticação
async function authenticate(request: Request, env: Env) {
  console.log('Entrou no middleware authenticate para:', request.url);
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Não autorizado: Token não fornecido', { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) {
      return new Response('Não autorizado: Token inválido', { status: 401 });
    }
    const decoded = decode(token);
    (request as any).user = decoded.payload as User; // Anexa o usuário ao objeto request
  } catch (error) {
    console.error('Erro de autenticação:', error);
    return new Response('Não autorizado: Erro no token', { status: 401 });
  }
}

// Middleware de Autorização
function authorize(allowedRoles: UserRole[]) {
  return async (request: Request, env: Env) => {
    console.log('Entrou no middleware authorize para:', request.url);
    const user: User = (request as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return new Response('Proibido: Você não tem permissão para realizar esta ação.', { status: 403 });
    }
  };
}

// --- ROTAS DE AUTENTICAÇÃO ---

router.post("/api/signup", async (request, env: Env) => {
  const { email, password, role } = await request.json<{
    email: string;
    password: string;
    role?: string;
  }>();

  // verifica se já existe
  const existing = await env.USERS_KV.get(email);
  if (existing) {
    return new Response("Usuário já existe", { status: 409 });
  }

  // gera ID simples (pode ser UUID real se quiser mais robusto)
  const id = crypto.randomUUID();

  // hash da senha
  const hashedPassword = await hash(password, 10);

  // cria usuário
  const newUser: User = {
    id,
    email,
    password: hashedPassword,
    role: "cliente",
  };

  // salva no KV
  await env.USERS_KV.put(email, JSON.stringify(newUser));

  // já retorna JWT para login automático
  const payload = {
    sub: newUser.email,
    role: newUser.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
  };

  const token = await sign(payload, env.JWT_SECRET);

  return new Response(
    JSON.stringify({
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }
  );
});

router.post('/api/login', async (request, env: Env) => {
  const { email, password } = await request.json<{ email: string; password: string }>();

  const userString = await env.USERS_KV.get(email);
  if (!userString) {
    return new Response('Email ou senha inválidos.', { status: 401 });
  }

  const user: User = JSON.parse(userString);

  if (!user.password || !(await compare(password, user.password))) {
    return new Response('Email ou senha inválidos.', { status: 401 });
  }

  // gera token JWT
  const payload = {
    sub: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hora
  };

  const token = await sign(payload, env.JWT_SECRET);

  return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email, role: user.role } }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});

// --- ROTAS PROTEGIDAS (com autenticação e autorização) ---

// USER
router.get('/api/users', authenticate, authorize([ROLES.ADMIN]), async (request, env: Env) => {
  const { keys } = await env.USERS_KV.list();
  const usersPromises = keys.map(async key => {
    const userString = await env.USERS_KV.get(key.name);
    if (userString) {
      const { password, ...user } = JSON.parse(userString);
      return user;
    }
    return null;
  });
  const users = (await Promise.all(usersPromises)).filter(Boolean);
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// POUSADA INFO
router.get('/api/pousada-info', async (request, env: Env) => {
  console.log('Entrou na rota /api/pousada-info');
  const infoString = await env.POUSADA_INFO_KV.get('pousada_info');
  console.log('Obteve infoString do KV:', infoString ? 'sim' : 'não');
  if (!infoString) {
    // Retorna um valor padrão se não houver informações
    const defaultInfo: PousadaInfo = {
      description: 'Bem-vindo à Pousada Oásis, um refúgio de paz e tranquilidade em meio à natureza. Oferecemos conforto e uma experiência inesquecível para suas férias.',
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
  return new Response(JSON.stringify(JSON.parse(infoString)), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.put('/api/pousada-info', authenticate, authorize([ROLES.ADMIN]), async (request, env: Env) => {
  const info: PousadaInfo = await request.json();
  await env.POUSADA_INFO_KV.put('pousada_info', JSON.stringify(info));
  return new Response(JSON.stringify(info), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// BOOKINGS
router.get('/api/bookings', authenticate, async (request, env: Env) => {
  const user: User = (request as any).user;
  const { keys } = await env.BOOKINGS_KV.list();
  const bookingsPromises = keys.map(async key => {
    const bookingString = await env.BOOKINGS_KV.get(key.name);
    return bookingString ? JSON.parse(bookingString) : null;
  });
  let bookings: Booking[] = (await Promise.all(bookingsPromises)).filter(Boolean);

  // Clientes só podem ver suas próprias reservas
  if (user.role === ROLES.CLIENTE) {
    bookings = bookings.filter(b => b.usuario_id === user.id);
  }

  return new Response(JSON.stringify(bookings), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/api/bookings', authenticate, authorize([ROLES.CLIENTE, ROLES.ADMIN]), async (request, env: Env) => {
  const bookingData: Omit<Booking, 'id' | 'usuario_id'> = await request.json();
  const user: User = (request as any).user;

  const newBooking: Booking = {
    ...bookingData,
    id: Date.now().toString(),
    usuario_id: user.id, // Garante que a reserva seja associada ao usuário autenticado
  };
  await env.BOOKINGS_KV.put(newBooking.id, JSON.stringify(newBooking));
  return new Response(JSON.stringify(newBooking), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
});

router.put('/api/bookings/:id', authenticate, authorize([ROLES.ADMIN]), async (request, env: Env) => {
  const id = (request as any).params.id;
  const bookingData: Booking = await request.json();

  const existingBookingString = await env.BOOKINGS_KV.get(id);
  if (!existingBookingString) {
    return new Response('Reserva não encontrada.', { status: 404 });
  }

  // Validação adicional: Admin pode editar qualquer reserva
  // Se fosse permitir cliente editar, precisaria verificar se bookingData.usuario_id === user.id

  await env.BOOKINGS_KV.put(id, JSON.stringify({ ...bookingData, id })); // Garante que o ID não seja alterado
  return new Response(JSON.stringify({ ...bookingData, id }), {
    headers: { 'Content-Type': 'application/json' }
  });
});


// IMAGES (R2)
router.get('/api/images', async (request, env: Env) => {
  console.log('Entrou na rota /api/images');
  const listed = await env.IMAGES_R2.list();
  console.log('Listou objetos R2. Quantidade:', listed.objects.length);
  const images: Image[] = listed.objects.map(obj => ({
    id: obj.key, // Usamos o nome do objeto R2 como ID
    url: `/api/images/${obj.key}`, // URL para acessar a imagem diretamente
    alt: obj.key.split('.')[0], // Exemplo simples para alt
  }));
  return new Response(JSON.stringify(images), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Rota para servir a imagem diretamente
router.get('/api/images/:id', async (request, env: Env) => {
  const id = (request as any).params.id;
  const object = await env.IMAGES_R2.get(id);

  if (!object) {
    return new Response('Imagem não encontrada.', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, {
    headers,
  });
});

router.post('/api/images', authenticate, authorize([ROLES.ADMIN]), async (request, env: Env) => {
  // Para upload de arquivos, o request.json() não funciona.
  // Precisamos ler o FormData.
  const formData = await request.formData();
  const file = formData.get('file') as File; // 'file' deve ser o nome do campo no FormData

  if (!file) {
    return new Response('Nenhum arquivo enviado.', { status: 400 });
  }

  // Gera um nome de arquivo único ou usa o nome original
  const filename = `${Date.now()}-${file.name}`;
  await env.IMAGES_R2.put(filename, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const newImage: Image = {
    id: filename,
    url: `/api/images/${filename}`,
    alt: file.name,
  };

  return new Response(JSON.stringify(newImage), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
});

router.delete('/api/images/:id', authenticate, authorize([ROLES.ADMIN]), async (request, env: Env) => {
  const id = (request as any).params.id;
  await env.IMAGES_R2.delete(id);
  return new Response(null, { status: 204 });
});


// Fallback para rotas não encontradas
// router.all('*', () => new Response('Não encontrado.', { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log('Worker: Recebeu requisição principal para:', request.url);
    try {
      // Verifica se os bindings KV/R2 estão presentes
      if (!env.USERS_KV || !env.BOOKINGS_KV || !env.POUSADA_INFO_KV || !env.IMAGES_R2) {
        return new Response('Bindings KV/R2 não configurados corretamente.', { status: 500 });
      }

      // Se for rota de API, delega para o router
      if (request.url.includes('/api/')) {
        const response = await router.handle(request, env, ctx);
        if (response) return response;
        return new Response('API route not found', { status: 404 });
      }

      // Servir arquivos estáticos do React (dist)
      const url = new URL(request.url);
      let assetPath = url.pathname;
      if (assetPath === '/' || assetPath === '') {
        assetPath = '/index.html';
      }
      try {
        if (env.ASSETS) {
          const asset = await env.ASSETS.fetch(new Request(assetPath));
          if (asset && asset.status !== 404) return asset;
        }
      } catch (e) {
        console.error('Erro ao buscar asset:', assetPath, e);
      }

      // Fallback: retorna index.html para SPA
      if (env.ASSETS) {
        const indexAsset = await env.ASSETS.fetch(new Request('/index.html'));
        if (indexAsset) return indexAsset;
      }
      return new Response('Not found', { status: 404 });
    } catch (err: any) {
      console.error(`Worker: ERRO FATAL no handle do roteador para ${request.url}:`, err);
      return new Response(err.stack || 'Erro interno do servidor', { status: 500 });
    }
  },
};

// ... dentro do router.all('*')
router.all('*', () => new Response('Não encontrado.', { status: 404 }));