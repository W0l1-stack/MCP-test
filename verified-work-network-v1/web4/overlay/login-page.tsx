'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
);

type Intent = 'find_work' | 'hire';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [intent, setIntent] = useState<Intent>('find_work');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('is_job_seeker,is_employer').eq('id', data.user.id).single();
      if (p?.is_employer && !p?.is_job_seeker) window.location.href = '/employer';
      else window.location.href = '/dashboard';
    })();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      const { data: p } = await supabase.from('profiles').select('is_job_seeker,is_employer').eq('id', data.user.id).single();
      window.location.href = p?.is_employer && !p?.is_job_seeker ? '/employer' : '/dashboard';
      return;
    }

    if (!name.trim()) {
      setMessage('Enter your full name.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { display_name: name.trim(), signup_intent: intent }
      }
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage(`Account created. Check ${email.trim()} to confirm your email, then sign in.`);
      setLoading(false);
      return;
    }

    window.location.href = intent === 'hire' ? '/employer' : '/profile';
  }

  return <main className="auth-page">
    <style jsx global>{`
      *{box-sizing:border-box} body{margin:0;background:#f6f8fb;color:#101828;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.auth-page{min-height:calc(100vh - 70px);display:grid;place-items:center;padding:44px 18px 72px}.auth-shell{width:min(100%,980px);display:grid;grid-template-columns:1.05fr .95fr;background:white;border:1px solid #e6eaf0;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.08)}.auth-story{padding:54px;background:linear-gradient(145deg,#0f172a,#172554);color:white;display:flex;flex-direction:column;justify-content:space-between;min-height:650px}.brand-mark{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:white;color:#0f172a;font-weight:900}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#b8c7ff}.auth-story h1{font-size:44px;line-height:1.05;margin:18px 0 16px;letter-spacing:-.035em}.auth-story p{color:#dbe4ff;line-height:1.65;font-size:16px;max-width:480px}.trust-list{display:grid;gap:13px;margin-top:34px}.trust-item{display:flex;gap:12px;align-items:flex-start;color:#eef2ff;font-size:14px}.tick{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;flex:none}.auth-form{padding:46px 44px}.tabs{display:grid;grid-template-columns:1fr 1fr;background:#f2f4f7;padding:4px;border-radius:12px;margin-bottom:28px}.tab{border:0;background:transparent;padding:10px 14px;border-radius:9px;font-weight:750;color:#667085;cursor:pointer}.tab.active{background:white;color:#101828;box-shadow:0 1px 4px rgba(16,24,40,.08)}.auth-form h2{font-size:28px;letter-spacing:-.025em;margin:0 0 8px}.sub{color:#667085;margin:0 0 24px;line-height:1.5}.field{display:grid;gap:7px;margin-top:15px}.field span{font-size:13px;font-weight:750;color:#344054}.field input{width:100%;border:1px solid #d0d5dd;border-radius:11px;padding:12px 13px;font-size:15px;outline:none;background:white}.field input:focus{border-color:#475467;box-shadow:0 0 0 3px rgba(71,84,103,.08)}.intent-label{font-size:13px;font-weight:750;color:#344054;margin:18px 0 9px}.intent-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.intent{border:1px solid #d0d5dd;background:white;border-radius:14px;padding:14px;text-align:left;cursor:pointer;transition:.15s ease}.intent.selected{border-color:#101828;box-shadow:0 0 0 2px #1018280f;background:#f8fafc}.intent strong{display:block;font-size:14px;margin-bottom:4px}.intent small{display:block;color:#667085;line-height:1.45}.submit{width:100%;border:0;border-radius:11px;background:#101828;color:white;padding:13px 16px;font-size:15px;font-weight:800;cursor:pointer;margin-top:22px}.submit:disabled{opacity:.6;cursor:not-allowed}.message{margin-top:16px;border-radius:11px;padding:11px 12px;background:#f2f4f7;color:#344054;font-size:13px;line-height:1.45}.helper{font-size:12px;color:#667085;line-height:1.5;margin-top:14px}.reset{display:inline-block;margin-top:12px;color:#344054;font-size:13px;text-decoration:none;font-weight:650}@media(max-width:780px){.auth-shell{grid-template-columns:1fr}.auth-story{min-height:auto;padding:34px}.auth-story h1{font-size:34px}.trust-list{display:none}.auth-form{padding:32px 24px}.intent-grid{grid-template-columns:1fr}}
    `}</style>

    <div className="auth-shell">
      <section className="auth-story">
        <div>
          <div className="brand-mark">V</div>
          <div className="eyebrow" style={{marginTop:26}}>VerifiedWork</div>
          <h1>Work should start with trust.</h1>
          <p>Checked vacancies, clear pay, verified employment outcomes and a reputation trail that follows real work, not empty profile claims.</p>
          <div className="trust-list">
            <div className="trust-item"><span className="tick">✓</span><span>See salary and location before you apply.</span></div>
            <div className="trust-item"><span className="tick">✓</span><span>Applicants never pay to apply.</span></div>
            <div className="trust-item"><span className="tick">✓</span><span>Employment becomes verified only after both sides confirm.</span></div>
          </div>
        </div>
        <small style={{color:'#aebcf1'}}>Real jobs. Real businesses. Verified before you apply.</small>
      </section>

      <section className="auth-form">
        <div className="tabs">
          <button type="button" className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setMessage(''); }}>Sign in</button>
          <button type="button" className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setMessage(''); }}>Create account</button>
        </div>

        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="sub">{mode === 'login' ? 'Continue to your VerifiedWork account.' : 'First, tell us what you came here to do.'}</p>

        <form onSubmit={submit}>
          {mode === 'signup' && <>
            <div className="intent-label">I want to</div>
            <div className="intent-grid">
              <button type="button" className={`intent ${intent === 'find_work' ? 'selected' : ''}`} onClick={() => setIntent('find_work')}>
                <strong>Find a job</strong><small>Build a worker profile, discover checked vacancies and apply.</small>
              </button>
              <button type="button" className={`intent ${intent === 'hire' ? 'selected' : ''}`} onClick={() => setIntent('hire')}>
                <strong>Hire people</strong><small>Create an employer profile, verify a workplace and post vacancies.</small>
              </button>
            </div>
            <label className="field"><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" /></label>
          </>}

          <label className="field"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
          <label className="field"><span>Password</span><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></label>

          <button className="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : intent === 'hire' ? 'Create employer account' : 'Create worker account'}</button>
        </form>

        {message && <div className="message">{message}</div>}
        {mode === 'login' && <a className="reset" href="/reset-password">Forgot your password?</a>}
        {mode === 'signup' && <p className="helper">You can enable the other side later. Choosing a starting mode only changes the first setup experience.</p>}
      </section>
    </div>
  </main>;
}
