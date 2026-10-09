import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '/app';
const candidates = [path.join(root, 'src', 'app'), path.join(root, 'app')];
const appDir = candidates.find((p) => fs.existsSync(p));
if (!appDir) {
  console.error('Could not locate Next.js app directory under', root);
  process.exit(1);
}

const overlayDir = path.dirname(new URL(import.meta.url).pathname);
const copyRoute = (route, sourceName) => {
  const destDir = path.join(appDir, route);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(overlayDir, sourceName), path.join(destDir, 'page.tsx'));
  console.log(`VerifiedWork overlay: ${route} -> ${path.join(destDir, 'page.tsx')}`);
};

copyRoute('login', 'login-page.tsx');
copyRoute('profile', 'profile-page.tsx');
copyRoute('account', 'account-page.tsx');

console.log('VerifiedWork account/profile overlay applied using app dir:', appDir);
