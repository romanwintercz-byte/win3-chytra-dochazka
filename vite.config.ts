import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Načte env proměnné (i ty z Vercelu při buildu)
  // Třetí parametr '' zajistí načtení všech proměnných, nejen těch s prefixem VITE_
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Toto nahradí 'process.env.API_KEY' v kódu za skutečnou hodnotu klíče během buildu
      // Podporuje jak čistý 'API_KEY', tak 'VITE_API_KEY'
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
    },
  };
});
