import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'client',plugins:[react()],base:process.env.NODE_ENV==='production'?'/app/':'/',publicDir:'public',server:{proxy:{'/api':'http://localhost:3000'}},build:{outDir:'../public/app',emptyOutDir:true}});
