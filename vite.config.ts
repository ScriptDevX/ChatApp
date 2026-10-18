import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import JavaScriptObfuscator, { ObfuscatorOptions } from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';

function postBuildObfuscator(options: ObfuscatorOptions): Plugin {
  return {
    name: 'vite-plugin-post-build-obfuscator',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const distAssetsDir = path.resolve(__dirname, 'dist/assets');
      if (!fs.existsSync(distAssetsDir)) return;
      const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
      console.log(`\nObfuscating ${files.length} production bundles...`);
      for (const file of files) {
        const fullPath = path.join(distAssetsDir, file);
        const code = fs.readFileSync(fullPath, 'utf8');
        const obfuscated = JavaScriptObfuscator.obfuscate(code, options);
        fs.writeFileSync(fullPath, obfuscated.getObfuscatedCode(), 'utf8');
      }
      console.log('✓ All production bundles obfuscated successfully.');
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    postBuildObfuscator({
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.3,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: false,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ['rc4'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 5,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 5,
      stringArrayWrappersType: 'function',
      stringArrayThreshold: 0.75,
      unicodeEscapeSequence: false,
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Automated vendor library code-splitting to prevent giant 500kB+ single bundles
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/')[1]?.split('/');
            if (parts && parts.length > 0) {
              const pkgName = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
              // Group heavy packages into discrete sub-vendor chunks
              return `v_${pkgName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 8)}`;
            }
            return 'v_lib';
          }
        },
      },
    },
  },
});
