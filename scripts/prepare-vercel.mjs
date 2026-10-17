import { access, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const clientDist = path.join(projectRoot, 'client', 'dist');
const publicDirectory = path.join(projectRoot, 'public');

try {
  await access(path.join(clientDist, 'index.html'));
} catch {
  console.error('[vercel] client/dist/index.html was not found. Run the client build first.');
  process.exit(1);
}

// Copy the completed Vite build into the root public/ directory. Existing
// public files are preserved; matching build files are overwritten.
await mkdir(publicDirectory, { recursive: true });
await cp(clientDist, publicDirectory, { recursive: true, force: true });

console.log('[vercel] Copied client/dist into public/ for Vercel CDN hosting.');
