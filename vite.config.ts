import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { rolldownOptions: { input: { landing: 'index.html', app: 'app.html' } } },
  server: { watch: { ignored: ['**/.cache/**', '**/docs/qa/**'] } },
});
