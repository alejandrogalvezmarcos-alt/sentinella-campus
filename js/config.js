// Configuració del núvol (Supabase).
// Buit = mode local: comptes i progrés només en aquest dispositiu.
// Per activar comptes compartits i el panell docent real, crea un projecte gratuït a supabase.com,
// executa supabase/schema.sql i enganxa aquí la URL del projecte i la clau pública "anon".
// La clau "anon" és pública per disseny: la seguretat la donen les regles RLS de schema.sql.
export const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};
