import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path'
import {readFileSync, writeFileSync} from 'fs'

const __dirname = import.meta.dirname

// Plugin to copy index.html to 404.html for SPA routing
const copy404Plugin = () => ({
    name: 'copy-404',
    closeBundle() {
        const indexPath = resolve(__dirname, 'dist/index.html')
        const notFoundPath = resolve(__dirname, 'dist/404.html')
        writeFileSync(notFoundPath, readFileSync(indexPath))
    }
})

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), copy404Plugin()],
})
