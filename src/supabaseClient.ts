// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Para Vite
const supabaseUrl = "https://hbiyvfxnaddpibmkgboc.supabase.coVITE_SUPABASE_ANON_KEY";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaXl2ZnhuYWRkcGlibWtnYm9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjM0MDUsImV4cCI6MjA3NDQzOTQwNX0.cfvsOq6aQDJGCj_hkGpvXaUiBTE5jbqTWyhLL1DR60A";

// Para Create React App (descomente se for o seu caso)
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl); // Verifique se a URL está correta
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Chave carregada' : 'Chave não carregada');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);