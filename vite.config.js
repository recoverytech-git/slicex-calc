import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Explícito por segurança — protege contra regressões do resolvedor
    // padrão em versões do Vite/Rolldown que deixam de tentar .jsx
    // automaticamente quando o import não tem extensão.
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
})
