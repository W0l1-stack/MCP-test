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

const replaceOrFail = (source, from, to, label) => {
  if (!source.includes(from)) {
    console.error(`VerifiedWork overlay patch marker missing: ${label}`);
    process.exit(1);
  }
  return source.replace(from, to);
};

copyRoute('login', 'login-page.tsx');
copyRoute('profile', 'profile-page.tsx');
copyRoute('account', 'account-page.tsx');

const profilePath = path.join(appDir, 'profile', 'page.tsx');
let profileSource = fs.readFileSync(profilePath, 'utf8');

profileSource = replaceOrFail(
  profileSource,
  '.vp-check{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:#344054}.vp-check input{margin-top:2px}',
  '.vp-toggle-card{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #d0d5dd;background:#fff;border-radius:14px;padding:14px 15px;text-align:left;color:#344054;cursor:pointer;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}.vp-toggle-card:hover{border-color:#98a2b3}.vp-toggle-card.on{border-color:#101828;background:#f8fafc;box-shadow:0 0 0 3px rgba(16,24,40,.035)}.vp-toggle-copy{display:grid;gap:3px}.vp-toggle-copy strong{font-size:13px}.vp-switch{width:42px;height:24px;border-radius:999px;background:#d0d5dd;position:relative;flex:none;transition:background .15s ease}.vp-switch:after{content:\"\";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(16,24,40,.25);transition:transform .15s ease}.vp-toggle-card.on .vp-switch{background:#101828}.vp-toggle-card.on .vp-switch:after{transform:translateX(18px)}',
  'toggle styles'
);

profileSource = replaceOrFail(
  profileSource,
  '<div className="vp-subsection"><label className="vp-check"><input type="checkbox" checked={!!profile.willing_to_relocate} onChange={(e)=>setProfile({...profile,willing_to_relocate:e.target.checked})}/><span><strong>Open to relocation</strong><br/><span className="vp-muted">Employers can see that you are willing to move for the right role.</span></span></label></div>',
  '<div className="vp-subsection"><button type="button" className={`vp-toggle-card ${profile.willing_to_relocate?\'on\':\'\'}`} aria-pressed={!!profile.willing_to_relocate} onClick={()=>setProfile({...profile,willing_to_relocate:!profile.willing_to_relocate})}><span className="vp-toggle-copy"><strong>Open to relocation</strong><span className="vp-muted">Show employers that you are willing to move for the right role.</span></span><span className="vp-switch" aria-hidden="true" /></button></div>',
  'relocation toggle'
);

profileSource = replaceOrFail(
  profileSource,
  '<label className="vp-check full"><input type="checkbox" checked={!!row.is_current} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,is_current:e.target.checked}:r))}/><span>I currently work here</span></label>',
  '<div className="vp-field full"><button type="button" className={`vp-toggle-card ${row.is_current?\'on\':\'\'}`} aria-pressed={!!row.is_current} onClick={()=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,is_current:!r.is_current,end_date:!r.is_current?\'\':r.end_date}:r))}><span className="vp-toggle-copy"><strong>I currently work here</strong><span className="vp-muted">Turn this on if this role has no end date yet.</span></span><span className="vp-switch" aria-hidden="true" /></button></div>',
  'saved experience current-role toggle'
);

profileSource = replaceOrFail(
  profileSource,
  '<label className="vp-check full"><input type="checkbox" checked={newExp.is_current} onChange={(e)=>setNewExp({...newExp,is_current:e.target.checked})}/><span>I currently work here</span></label>',
  '<div className="vp-field full"><button type="button" className={`vp-toggle-card ${newExp.is_current?\'on\':\'\'}`} aria-pressed={!!newExp.is_current} onClick={()=>setNewExp({...newExp,is_current:!newExp.is_current,end_date:!newExp.is_current?\'\':newExp.end_date})}><span className="vp-toggle-copy"><strong>I currently work here</strong><span className="vp-muted">Turn this on if this role has no end date yet.</span></span><span className="vp-switch" aria-hidden="true" /></button></div>',
  'new experience current-role toggle'
);

fs.writeFileSync(profilePath, profileSource);
console.log('VerifiedWork profile toggles polished.');
console.log('VerifiedWork account/profile overlay applied using app dir:', appDir);
