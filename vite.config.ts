import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split vendor chunks for better caching and faster mobile loads
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime — cached across deploys
            'react-vendor': ['react', 'react-dom'],
            // Supabase client — large but stable
            'supabase-vendor': ['@supabase/supabase-js'],
            // Icon library
            'icons-vendor': ['lucide-react'],
          },
        },
      },
      // Target modern browsers — smaller output, no legacy polyfills
      target: 'es2020',
      // Raise warning threshold since we now split chunks
      chunkSizeWarningLimit: 400,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
