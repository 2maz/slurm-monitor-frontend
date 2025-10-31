import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    allowedHosts: [
      "srl-login3.ex3.simula.no",
      "naic-monitor.simula.no",
      "localhost"
    ]
  },
  plugins: [react()],
  envPrefix: 'SLURM_MONITOR_'
})
