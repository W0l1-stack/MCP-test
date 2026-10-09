'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
);

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
      const { data: p } = await supabase.from('profiles').select('display_name,headline,city,state,is_job_seeker,is_employer,account_status').eq('id', data.user.id).single();
      setProfile(p || null);
    })();
  }, []);

  async function setRole(field: 'is_job_seeker' | 'is_employer', value: boolean) {
    if (!user || !profile) return;
    if (!value && ((field === 'is_job_seeker' && !profile.is_employer) || (field === 'is_employer' && !profile.is_job_seeker))) {
      return setMessage('Keep at least one account mode enabled.');
    }
    const { error } = await supabase.from('profiles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) return setMessage(error.message);
    setProfile({ ...profile, [field]: value });
    setMessage('Account mode updated.');
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = '/login';
  }

  return <main className="acc-page">
    <style jsx global>{`
      *{box-sizing:border-box}body{background:#f7f8fa;color:#101828}.acc-page{max-width:920px;margin:0 auto;padding:34px 20px 78px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.acc-back{color:#667085;text-decoration:none;font-size:13px;font-weight:650}.acc-page h1{font-size:34px;letter-spacing:-.035em;margin:10px 0 7px}.acc-sub{color:#667085;margin:0 0 22px}.acc-card{background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:22px;margin-top:16px;box-shadow:0 8px 26px rgba(16,24,40,.035)}.acc-card h2{font-size:18px;margin:0 0 6px}.acc-muted{color:#667085;font-size:13px;line-height:1.5}.acc-modes{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.acc-mode{border:1px solid #d0d5dd;border-radius:14px;padding:16px;background:#fff}.acc-mode.on{border-color:#101828;background:#f8fafc}.acc-mode-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.acc-mode strong{font-size:14px}.acc-toggle{border:1px solid #d0d5dd;border-radius:999px;padding:7px 10px;background:white;font-size:12px;font-weight:750;cursor:pointer}.acc-toggle.on{background:#101828;color:white;border-color:#101828}.acc-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.acc-primary,.acc-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:750;text-decoration:none;cursor:pointer}.acc-primary{background:#101828;color:#fff;border:0}.acc-secondary{background:#fff;color:#344054;border:1px solid #d0d5dd}.acc-message{margin-top:14px;border:1px solid #d0d5dd;border-radius:11px;padding:10px 12px;background:#fff;font-size:13px}@media(max-width:640px){.acc-modes{grid-template-columns:1fr}.acc-page{padding:24px 14px 64px}.acc-page h1{font-size:28px}}
    `}</style>
    <a className="acc-back" href="/dashboard">← Back to dashboard</a>
    <h1>Account</h1>
    <p className="acc-sub">Manage your sign-in, worker profile and the parts of VerifiedWork you use.</p>
    {message && <div className="acc-message">{message}</div>}

    <section className="acc-card">
      <h2>Your account mode</h2>
      <p className="acc-muted">You choose a starting mode at signup. You can enable both later if you genuinely use VerifiedWork as both a worker and an employer.</p>
      <div className="acc-modes">
        <div className={`acc-mode ${profile?.is_job_seeker ? 'on' : ''}`}><div className="acc-mode-head"><div><strong>Find a job</strong><p className="acc-muted">Worker profile, job search, applications and employment history.</p></div><button className={`acc-toggle ${profile?.is_job_seeker ? 'on' : ''}`} onClick={()=>void setRole('is_job_seeker',!profile?.is_job_seeker)}>{profile?.is_job_seeker?'Enabled':'Enable'}</button></div>{profile?.is_job_seeker && <div className="acc-actions"><a className="acc-primary" href="/profile">Edit worker profile</a><a className="acc-secondary" href="/jobs">Find jobs</a></div>}</div>
        <div className={`acc-mode ${profile?.is_employer ? 'on' : ''}`}><div className="acc-mode-head"><div><strong>Hire people</strong><p className="acc-muted">Employer profile, workplace verification, vacancies and applicants.</p></div><button className={`acc-toggle ${profile?.is_employer ? 'on' : ''}`} onClick={()=>void setRole('is_employer',!profile?.is_employer)}>{profile?.is_employer?'Enabled':'Enable'}</button></div>{profile?.is_employer && <div className="acc-actions"><a className="acc-primary" href="/employer">Employer area</a></div>}</div>
      </div>
    </section>

    <section className="acc-card">
      <h2>Signed-in account</h2>
      <p><strong>{profile?.display_name || 'User'}</strong></p>
      <p className="acc-muted">{user?.email || 'Loading…'}</p>
      <p className="acc-muted">Status: {profile?.account_status || 'active'}</p>
      <div className="acc-actions"><a className="acc-secondary" href="/reset-password">Password & recovery</a><button onClick={()=>void signOut()} className="acc-secondary">Sign out</button></div>
    </section>
  </main>;
}
