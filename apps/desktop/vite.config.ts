import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@ai-companion/core': path.resolve(rootDir, 'packages/core/src'),
      '@ai-companion/shared': path.resolve(rootDir, 'packages/shared/src'),
      '@ai-companion/ui': path.resolve(rootDir, 'packages/ui/src'),
      '@ai-companion/emotion-engine': path.resolve(rootDir, 'packages/emotion-engine/src'),
      '@ai-companion/character-engine': path.resolve(rootDir, 'packages/character-engine/src'),
      '@ai-companion/behavior-engine': path.resolve(rootDir, 'packages/behavior-engine/src'),
      '@ai-companion/animation-engine': path.resolve(rootDir, 'packages/animation-engine/src'),
      '@ai-companion/memory-engine': path.resolve(rootDir, 'packages/memory-engine/src'),
      '@ai-companion/ai-service': path.resolve(rootDir, 'packages/ai-service/src'),
    },
  },
});
