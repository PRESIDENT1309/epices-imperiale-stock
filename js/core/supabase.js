// Connexion à Supabase. L’adresse et la clé publique sont dans config.js (à la racine).
const {SB_URL,SB_KEY}=window.EI_CONFIG;
export const sb=window.supabase.createClient(SB_URL,SB_KEY);
export {SB_KEY};
