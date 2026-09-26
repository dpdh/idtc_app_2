import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('www');
const entries = ['index.html', 'app.js', 'styles.css', 'sw.js', 'manifest.webmanifest', 'assets', 'data'];

await mkdir(output, { recursive: true });
for (const entry of entries) {
  await cp(resolve(entry), resolve(output, entry), { recursive: true, force: true });
}