// worker.ts

interface Env {
  ASSETS: Fetcher; // O serviço que contém os arquivos estáticos do seu front-end
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Se a rota começa com /api/, agora ela não existe mais aqui. 
    // O front-end falará diretamente com a URL do Supabase.
    // Você pode até retornar um 404 para essas rotas para evitar confusão.
    if (url.pathname.startsWith('/api/')) {
      return new Response('API movida para o Supabase. Acesse diretamente pela URL do projeto.', { status: 410 }); // 410 Gone
    }

    // A única lógica que resta é servir os arquivos estáticos da sua SPA.
    if (env.ASSETS) {
      try {
        // Tenta servir o arquivo solicitado
        return await env.ASSETS.fetch(request);
        
      } catch (error) {
        console.error('Asset serving error:', error);
        return new Response('Erro ao carregar o conteúdo.', { status: 500 });
      }
    }

    return new Response('Serviço de assets não configurado.', { status: 404 });
  },
};