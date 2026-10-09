'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
);

const shell: React.CSSProperties = { maxWidth: 1040, margin: '0 auto', padding: '32px 18px 72px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#172033' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginTop: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '11px 12px', fontSize: 14, background: '#fff', color: '#0f172a' };
const label: React.CSSProperties = { display: 'grid', gap: 7, fontSize: 13, fontWeight: 650, color: '#334155' };
const primary: React.CSSProperties = { border: 0, borderRadius: 10, padding: '11px 16px', background: '#111827', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondary: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#172033', fontWeight: 650, cursor: 'pointer' };
const danger: React.CSSProperties = { ...secondary, color: '#b91c1c', borderColor: '#fecaca' };

function Checkbox({ checked, onChange, children }: any) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>;
}

export default function WorkerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({
    display_name: '', headline: '', city: '', state: '', professional_summary: '', skills_text: '', availability: '',
    expected_salary_min: '', expected_salary_max: '', preferred_roles: [], preferred_employment_types: [], preferred_work_modes: [],
    willing_to_relocate: false, cv_storage_path: ''
  });
  const [experiences, setExperiences] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [cvUrl, setCvUrl] = useState('');
  const [newExp, setNewExp] = useState<any>({ job_title: '', employer_name: '', location: '', employment_type: 'full_time', start_date: '', end_date: '', is_current: false, description: '' });
  const [newEdu, setNewEdu] = useState<any>({ school_name: '', qualification: '', field_of_study: '', graduation_year: '' });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setMessage('');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = '/login';
      return;
    }
    setUser(auth.user);
    const [{ data: p, error: pe }, { data: ex }, { data: ed }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.user.id).single(),
      supabase.from('worker_experiences').select('*').eq('user_id', auth.user.id).order('start_date', { ascending: false }),
      supabase.from('worker_education').select('*').eq('user_id', auth.user.id).order('graduation_year', { ascending: false })
    ]);
    if (pe) setMessage(pe.message);
    if (p) {
      setProfile({ ...profile, ...p, expected_salary_min: p.expected_salary_min ?? '', expected_salary_max: p.expected_salary_max ?? '' });
      if (p.cv_storage_path) {
        const { data } = await supabase.storage.from('profile-media').createSignedUrl(p.cv_storage_path, 600);
        if (data?.signedUrl) setCvUrl(data.signedUrl);
      }
    }
    setExperiences(ex || []);
    setEducation(ed || []);
    setLoading(false);
  }

  const completion = useMemo(() => {
    const checks = [
      !!profile.display_name, !!profile.headline, !!profile.city && !!profile.state, !!profile.professional_summary,
      !!profile.skills_text, !!profile.availability, profile.expected_salary_min !== '' || profile.expected_salary_max !== '',
      (profile.preferred_roles || []).length > 0, (profile.preferred_employment_types || []).length > 0,
      (profile.preferred_work_modes || []).length > 0, experiences.length > 0, education.length > 0, !!profile.cv_storage_path
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile, experiences, education]);

  function toggleArray(field: string, value: string, checked: boolean) {
    const current = new Set(profile[field] || []);
    checked ? current.add(value) : current.delete(value);
    setProfile((p: any) => ({ ...p, [field]: Array.from(current) }));
  }

  async function saveProfile(e?: FormEvent) {
    e?.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    const payload = {
      display_name: profile.display_name?.trim(), headline: profile.headline?.trim() || null, city: profile.city?.trim() || null,
      state: profile.state?.trim() || null, professional_summary: profile.professional_summary?.trim() || null,
      skills_text: profile.skills_text?.trim() || null, availability: profile.availability?.trim() || null,
      expected_salary_min: profile.expected_salary_min === '' ? null : Number(profile.expected_salary_min),
      expected_salary_max: profile.expected_salary_max === '' ? null : Number(profile.expected_salary_max),
      preferred_roles: profile.preferred_roles || [], preferred_employment_types: profile.preferred_employment_types || [],
      preferred_work_modes: profile.preferred_work_modes || [], willing_to_relocate: !!profile.willing_to_relocate,
      is_job_seeker: true, updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    setMessage(error ? error.message : 'Profile saved successfully.');
    setSaving(false);
  }

  async function uploadCv(file?: File) {
    if (!file || !user) return;
    if (file.type !== 'application/pdf') { setMessage('Please upload a PDF CV.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('CV must be 5 MB or smaller.'); return; }
    setSaving(true);
    const path = `${user.id}/cv/current.pdf`;
    const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (uploadError) { setMessage(uploadError.message); setSaving(false); return; }
    const { error } = await supabase.from('profiles').update({ cv_storage_path: path, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (!error) {
      setProfile((p: any) => ({ ...p, cv_storage_path: path }));
      const { data } = await supabase.storage.from('profile-media').createSignedUrl(path, 600);
      setCvUrl(data?.signedUrl || '');
    }
    setMessage(error ? error.message : 'CV uploaded privately.');
    setSaving(false);
  }

  async function addExperience(e: FormEvent) {
    e.preventDefault(); if (!user || !newExp.job_title || !newExp.employer_name) return;
    const payload = { ...newExp, user_id: user.id, start_date: newExp.start_date || null, end_date: newExp.is_current ? null : (newExp.end_date || null) };
    const { data, error } = await supabase.from('worker_experiences').insert(payload).select().single();
    if (error) return setMessage(error.message);
    setExperiences((x) => [data, ...x]);
    setNewExp({ job_title: '', employer_name: '', location: '', employment_type: 'full_time', start_date: '', end_date: '', is_current: false, description: '' });
    setMessage('Work experience added.');
  }

  async function saveExperience(row: any) {
    const { id, user_id, created_at, ...rest } = row;
    const { error } = await supabase.from('worker_experiences').update({ ...rest, end_date: rest.is_current ? null : (rest.end_date || null), updated_at: new Date().toISOString() }).eq('id', id);
    setMessage(error ? error.message : 'Experience updated.');
  }

  async function deleteExperience(id: string) {
    const { error } = await supabase.from('worker_experiences').delete().eq('id', id);
    if (!error) setExperiences((x) => x.filter((r) => r.id !== id));
    setMessage(error ? error.message : 'Experience removed.');
  }

  async function addEducation(e: FormEvent) {
    e.preventDefault(); if (!user || !newEdu.school_name) return;
    const payload = { ...newEdu, user_id: user.id, graduation_year: newEdu.graduation_year ? Number(newEdu.graduation_year) : null };
    const { data, error } = await supabase.from('worker_education').insert(payload).select().single();
    if (error) return setMessage(error.message);
    setEducation((x) => [data, ...x]);
    setNewEdu({ school_name: '', qualification: '', field_of_study: '', graduation_year: '' });
    setMessage('Education added.');
  }

  async function saveEducation(row: any) {
    const { id, user_id, created_at, ...rest } = row;
    const { error } = await supabase.from('worker_education').update({ ...rest, graduation_year: rest.graduation_year ? Number(rest.graduation_year) : null, updated_at: new Date().toISOString() }).eq('id', id);
    setMessage(error ? error.message : 'Education updated.');
  }

  async function deleteEducation(id: string) {
    const { error } = await supabase.from('worker_education').delete().eq('id', id);
    if (!error) setEducation((x) => x.filter((r) => r.id !== id));
    setMessage(error ? error.message : 'Education removed.');
  }

  if (loading) return <main style={shell}><p>Loading your worker profile…</p></main>;

  return <main style={shell}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
      <div><a href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 14 }}>← Dashboard</a><h1 style={{ fontSize: 32, margin: '10px 0 6px' }}>My worker profile</h1><p style={{ margin: 0, color: '#64748b' }}>Build the profile employers see after you apply. Sensitive identity data is not shown here.</p></div>
      <div style={{ minWidth: 190, background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}><strong>{completion}% complete</strong><div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, marginTop: 9, overflow: 'hidden' }}><div style={{ width: `${completion}%`, height: '100%', background: '#111827' }} /></div></div>
    </div>
    {message && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#f1f5f9', fontSize: 14 }}>{message}</div>}

    <form onSubmit={saveProfile}>
      <section style={card}><h2 style={{ marginTop: 0 }}>Professional profile</h2><div style={grid2}>
        <label style={label}>Full name<input style={input} value={profile.display_name || ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} required /></label>
        <label style={label}>Professional headline<input style={input} placeholder="Warehouse & Logistics Assistant" value={profile.headline || ''} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} /></label>
        <label style={label}>City<input style={input} value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></label>
        <label style={label}>State<input style={input} value={profile.state || ''} onChange={(e) => setProfile({ ...profile, state: e.target.value })} /></label>
      </div><label style={{ ...label, marginTop: 14 }}>Professional summary<textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} placeholder="Briefly describe your experience and the kind of work you do." value={profile.professional_summary || ''} onChange={(e) => setProfile({ ...profile, professional_summary: e.target.value })} /></label>
      <label style={{ ...label, marginTop: 14 }}>Skills<textarea style={{ ...input, minHeight: 85, resize: 'vertical' }} placeholder="Inventory management, Excel, customer service, record keeping" value={profile.skills_text || ''} onChange={(e) => setProfile({ ...profile, skills_text: e.target.value })} /></label></section>

      <section style={card}><h2 style={{ marginTop: 0 }}>Job preferences</h2><label style={label}>Preferred roles <span style={{ fontWeight: 400, color: '#64748b' }}>Comma separated</span><input style={input} placeholder="Warehouse Assistant, Logistics Assistant, Store Assistant" value={(profile.preferred_roles || []).join(', ')} onChange={(e) => setProfile({ ...profile, preferred_roles: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
      <div style={{ ...grid2, marginTop: 14 }}><label style={label}>Availability<input style={input} placeholder="Available immediately" value={profile.availability || ''} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} /></label><label style={label}>Minimum monthly salary (₦)<input style={input} type="number" min="0" value={profile.expected_salary_min ?? ''} onChange={(e) => setProfile({ ...profile, expected_salary_min: e.target.value })} /></label><label style={label}>Maximum monthly salary (₦)<input style={input} type="number" min="0" value={profile.expected_salary_max ?? ''} onChange={(e) => setProfile({ ...profile, expected_salary_max: e.target.value })} /></label></div>
      <div style={{ ...grid2, marginTop: 18 }}><div><strong style={{ fontSize: 14 }}>Employment type</strong>{['full_time','part_time','contract','temporary','gig','internship'].map((v) => <Checkbox key={v} checked={(profile.preferred_employment_types || []).includes(v)} onChange={(c: boolean) => toggleArray('preferred_employment_types', v, c)}>{v.replaceAll('_',' ')}</Checkbox>)}</div><div><strong style={{ fontSize: 14 }}>Work mode</strong>{['onsite','hybrid','remote'].map((v) => <Checkbox key={v} checked={(profile.preferred_work_modes || []).includes(v)} onChange={(c: boolean) => toggleArray('preferred_work_modes', v, c)}>{v}</Checkbox>)}</div><div><strong style={{ fontSize: 14 }}>Mobility</strong><Checkbox checked={!!profile.willing_to_relocate} onChange={(c: boolean) => setProfile({ ...profile, willing_to_relocate: c })}>Willing to relocate</Checkbox></div></div></section>

      <section style={card}><h2 style={{ marginTop: 0 }}>CV</h2><p style={{ color: '#64748b', fontSize: 14 }}>PDF only, maximum 5 MB. Your CV is stored in a private bucket under your account.</p><input type="file" accept="application/pdf,.pdf" onChange={(e) => void uploadCv(e.target.files?.[0])} disabled={saving} />{cvUrl && <p><a href={cvUrl} target="_blank" rel="noreferrer">View current CV</a> <span style={{ color: '#64748b' }}>(link expires in 10 minutes)</span></p>}</section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><button style={primary} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
    </form>

    <section style={card}><h2 style={{ marginTop: 0 }}>Work experience</h2>{experiences.map((row, i) => <div key={row.id} style={{ borderTop: i ? '1px solid #e5e7eb' : '0', paddingTop: i ? 18 : 0, marginTop: i ? 18 : 0 }}><div style={grid2}><label style={label}>Job title<input style={input} value={row.job_title || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, job_title: e.target.value } : x))} /></label><label style={label}>Employer<input style={input} value={row.employer_name || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, employer_name: e.target.value } : x))} /></label><label style={label}>Location<input style={input} value={row.location || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, location: e.target.value } : x))} /></label><label style={label}>Employment type<input style={input} value={row.employment_type || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, employment_type: e.target.value } : x))} /></label><label style={label}>Start date<input style={input} type="date" value={row.start_date || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, start_date: e.target.value } : x))} /></label><label style={label}>End date<input style={input} type="date" disabled={row.is_current} value={row.end_date || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, end_date: e.target.value } : x))} /></label></div><div style={{ marginTop: 10 }}><Checkbox checked={row.is_current} onChange={(c: boolean) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, is_current: c, end_date: c ? null : x.end_date } : x))}>I currently work here</Checkbox></div><label style={{ ...label, marginTop: 10 }}>Description<textarea style={{ ...input, minHeight: 80 }} value={row.description || ''} onChange={(e) => setExperiences((xs) => xs.map((x) => x.id === row.id ? { ...x, description: e.target.value } : x))} /></label><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button type="button" style={secondary} onClick={() => void saveExperience(row)}>Save</button><button type="button" style={danger} onClick={() => void deleteExperience(row.id)}>Remove</button></div></div>)}
      <form onSubmit={addExperience} style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #e5e7eb' }}><h3>Add experience</h3><div style={grid2}><label style={label}>Job title<input style={input} value={newExp.job_title} onChange={(e) => setNewExp({ ...newExp, job_title: e.target.value })} required /></label><label style={label}>Employer<input style={input} value={newExp.employer_name} onChange={(e) => setNewExp({ ...newExp, employer_name: e.target.value })} required /></label><label style={label}>Location<input style={input} value={newExp.location} onChange={(e) => setNewExp({ ...newExp, location: e.target.value })} /></label><label style={label}>Employment type<select style={input} value={newExp.employment_type} onChange={(e) => setNewExp({ ...newExp, employment_type: e.target.value })}>{['full_time','part_time','contract','temporary','gig','internship'].map((x) => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label style={label}>Start date<input style={input} type="date" value={newExp.start_date} onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })} /></label><label style={label}>End date<input style={input} type="date" disabled={newExp.is_current} value={newExp.end_date} onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })} /></label></div><div style={{ marginTop: 10 }}><Checkbox checked={newExp.is_current} onChange={(c: boolean) => setNewExp({ ...newExp, is_current: c, end_date: c ? '' : newExp.end_date })}>I currently work here</Checkbox></div><label style={{ ...label, marginTop: 10 }}>Description<textarea style={{ ...input, minHeight: 80 }} value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} /></label><button style={{ ...primary, marginTop: 12 }}>Add experience</button></form>
    </section>

    <section style={card}><h2 style={{ marginTop: 0 }}>Education</h2>{education.map((row, i) => <div key={row.id} style={{ borderTop: i ? '1px solid #e5e7eb' : '0', paddingTop: i ? 18 : 0, marginTop: i ? 18 : 0 }}><div style={grid2}><label style={label}>School<input style={input} value={row.school_name || ''} onChange={(e) => setEducation((xs) => xs.map((x) => x.id === row.id ? { ...x, school_name: e.target.value } : x))} /></label><label style={label}>Qualification<input style={input} value={row.qualification || ''} onChange={(e) => setEducation((xs) => xs.map((x) => x.id === row.id ? { ...x, qualification: e.target.value } : x))} /></label><label style={label}>Field of study<input style={input} value={row.field_of_study || ''} onChange={(e) => setEducation((xs) => xs.map((x) => x.id === row.id ? { ...x, field_of_study: e.target.value } : x))} /></label><label style={label}>Graduation year<input style={input} type="number" min="1950" max="2100" value={row.graduation_year || ''} onChange={(e) => setEducation((xs) => xs.map((x) => x.id === row.id ? { ...x, graduation_year: e.target.value } : x))} /></label></div><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button type="button" style={secondary} onClick={() => void saveEducation(row)}>Save</button><button type="button" style={danger} onClick={() => void deleteEducation(row.id)}>Remove</button></div></div>)}
      <form onSubmit={addEducation} style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #e5e7eb' }}><h3>Add education</h3><div style={grid2}><label style={label}>School<input style={input} value={newEdu.school_name} onChange={(e) => setNewEdu({ ...newEdu, school_name: e.target.value })} required /></label><label style={label}>Qualification<input style={input} value={newEdu.qualification} onChange={(e) => setNewEdu({ ...newEdu, qualification: e.target.value })} /></label><label style={label}>Field of study<input style={input} value={newEdu.field_of_study} onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })} /></label><label style={label}>Graduation year<input style={input} type="number" min="1950" max="2100" value={newEdu.graduation_year} onChange={(e) => setNewEdu({ ...newEdu, graduation_year: e.target.value })} /></label></div><button style={{ ...primary, marginTop: 12 }}>Add education</button></form>
    </section>
  </main>;
}
