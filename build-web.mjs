import { cp, mkdir, rm } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const output = resolve('www');
const assets = resolve('assets');
const entries = ['index.html', 'app.js', 'twini-config.js', 'admin-cms.js', 'shop.js', 'image-zoom.js', 'auth-security.js', 'ambient-bubbles.js', 'styles.css', 'sw.js', 'manifest.webmanifest', 'assets', 'data'];
const nativeOnlyAssets = new Set([
  'img/dni/IDTC_m copy.png',
  'img/dni/IDTC_m.png',
  'img/dni/ITDC_icon.ico',
  'img/dni/ITDC_icon_app_01.png',
  'img/dni/android-icon-background.png',
  'img/dni/android-icon-foreground.png',
  'img/dni/android-icon-monochrome.png',
  'img/dni/favicon.png',
  'img/dni/icon.png',
  'img/dni/idtc.png',
  'img/dni/splash-icon.png',
  'img/dni/splash-icon_02.png',
  'img/dni/twini shop.png',
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  const source = resolve(entry);
  const options = { recursive: true, force: true };
  if (entry === 'assets') {
    options.filter = path => !nativeOnlyAssets.has(relative(assets, path).split(sep).join('/'));
  }
  await cp(source, resolve(output, entry), options);
}