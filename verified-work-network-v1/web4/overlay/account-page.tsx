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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
      const { data: p } = await supabase.from('profiles').select('display_name,headline,city,state,is_job_seeker,is_employer,account_status').eq('id', data.user.id).single();
      setProfile(p || null);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = '/login';
  }

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginTop: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' };
  const button: React.CSSProperties = { display: 'inline-block', borderRadius: 10, padding: '11px 15px', background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 700, border: 0, cursor: 'pointer' };
  const secondary: React.CSSProperties = { ...button, background: '#fff', color: '#172033', border: '1px solid #cbd5e1' };

  return <main style={{ maxWidth: 860, margin: '0 auto', padding: '34px 18px 72px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#172033' }}>
    <a href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 14 }}>← Dashboard</a>
    <h1 style={{ marginBottom: 6 }}>Account</h1>
    <p style={{ marginTop: 0, color: '#64748b' }}>Manage your account and the profile you use to apply for work.</p>

    <section style={card}>
      <h2 style={{ marginTop: 0 }}>Worker profile</h2>
      <p style={{ color: '#475569' }}>{profile?.headline || 'Your professional profile is not complete yet.'}</p>
      <p style={{ color: '#64748b', fontSize: 14 }}>{profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Add your location, skills, preferences, work history, education and CV.'}</p>
      <a href="/profile" style={button}>Complete / edit worker profile</a>
    </section>

    <section style={card}>
      <h2 style={{ marginTop: 0 }}>Signed-in account</h2>
      <p><strong>{profile?.display_name || 'User'}</strong></p>
      <p style={{ color: '#64748b' }}>{user?.email || 'Loading…'}</p>
      <p style={{ color: '#64748b', fontSize: 14 }}>Status: {profile?.account_status || 'active'} · Worker: {profile?.is_job_seeker ? 'Yes' : 'No'} · Employer: {profile?.is_employer ? 'Yes' : 'No'}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><a href="/reset-password" style={secondary}>Password & recovery</a><button onClick={() => void signOut()} style={secondary}>Sign out</button></div>
    </section>

    <section style={card}>
      <h2 style={{ marginTop: 0 }}>Quick links</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><a href="/jobs" style={secondary}>Find jobs</a><a href="/dashboard" style={secondary}>Dashboard</a><a href="/employer" style={secondary}>Employer area</a></div>
    </section>
  </main>;
}
