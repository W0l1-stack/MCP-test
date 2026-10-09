'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
);

const EMPTY_EXP = { job_title: '', employer_name: '', location: '', employment_type: 'full_time', start_date: '', end_date: '', is_current: false, description: '' };
const EMPTY_EDU = { school_name: '', qualification: '', field_of_study: '', graduation_year: '' };

function formatChoice(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
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
  const [newExp, setNewExp] = useState<any>(EMPTY_EXP);
  const [newEdu, setNewEdu] = useState<any>(EMPTY_EDU);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = '/login'; return; }
    setUser(auth.user);
    const [{ data: p, error: pe }, { data: ex }, { data: ed }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.user.id).single(),
      supabase.from('worker_experiences').select('*').eq('user_id', auth.user.id).order('start_date', { ascending: false }),
      supabase.from('worker_education').select('*').eq('user_id', auth.user.id).order('graduation_year', { ascending: false })
    ]);
    if (pe) setMessage(pe.message);
    if (p) {
      setProfile((current: any) => ({ ...current, ...p, expected_salary_min: p.expected_salary_min ?? '', expected_salary_max: p.expected_salary_max ?? '' }));
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

  function toggleArray(field: string, value: string) {
    const current = new Set(profile[field] || []);
    current.has(value) ? current.delete(value) : current.add(value);
    setProfile((p: any) => ({ ...p, [field]: Array.from(current) }));
  }

  async function saveProfile(e?: FormEvent) {
    e?.preventDefault();
    if (!user) return;
    setSaving(true); setMessage('');
    const min = profile.expected_salary_min === '' ? null : Number(profile.expected_salary_min);
    const max = profile.expected_salary_max === '' ? null : Number(profile.expected_salary_max);
    if (min !== null && max !== null && max < min) {
      setMessage('Maximum salary cannot be lower than minimum salary.'); setSaving(false); return;
    }
    const { error } = await supabase.from('profiles').update({
      display_name: profile.display_name?.trim(), headline: profile.headline?.trim() || null,
      city: profile.city?.trim() || null, state: profile.state?.trim() || null,
      professional_summary: profile.professional_summary?.trim() || null,
      skills_text: profile.skills_text?.trim() || null, availability: profile.availability?.trim() || null,
      expected_salary_min: min, expected_salary_max: max,
      preferred_roles: profile.preferred_roles || [], preferred_employment_types: profile.preferred_employment_types || [],
      preferred_work_modes: profile.preferred_work_modes || [], willing_to_relocate: !!profile.willing_to_relocate,
      is_job_seeker: true, updated_at: new Date().toISOString()
    }).eq('id', user.id);
    setMessage(error ? error.message : 'Profile saved. Your job preferences are up to date.');
    setSaving(false);
  }

  async function uploadCv(file?: File) {
    if (!file || !user) return;
    if (file.type !== 'application/pdf') return setMessage('Please upload a PDF CV.');
    if (file.size > 5 * 1024 * 1024) return setMessage('CV must be 5 MB or smaller.');
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
    setMessage(error ? error.message : 'CV uploaded privately.'); setSaving(false);
  }

  async function addExperience(e: FormEvent) {
    e.preventDefault();
    if (!user || !newExp.job_title.trim() || !newExp.employer_name.trim()) return setMessage('Add a job title and employer.');
    const payload = { ...newExp, user_id: user.id, start_date: newExp.start_date || null, end_date: newExp.is_current ? null : (newExp.end_date || null) };
    const { data, error } = await supabase.from('worker_experiences').insert(payload).select().single();
    if (error) return setMessage(error.message);
    setExperiences((x) => [data, ...x]); setNewExp(EMPTY_EXP); setMessage('Work experience added.');
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
    e.preventDefault();
    if (!user || !newEdu.school_name.trim()) return setMessage('Add a school or institution.');
    const { data, error } = await supabase.from('worker_education').insert({ ...newEdu, user_id: user.id, graduation_year: newEdu.graduation_year ? Number(newEdu.graduation_year) : null }).select().single();
    if (error) return setMessage(error.message);
    setEducation((x) => [data, ...x]); setNewEdu(EMPTY_EDU); setMessage('Education added.');
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

  if (loading) return <main className="vp-loading">Loading your profile…</main>;

  return <main className="vp-page">
    <style jsx global>{`
      *{box-sizing:border-box} body{background:#f7f8fa;color:#101828}.vp-page{max-width:1180px;margin:0 auto;padding:34px 22px 80px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.vp-loading{max-width:1180px;margin:0 auto;padding:48px 22px;color:#475467}.vp-back{color:#667085;text-decoration:none;font-size:13px;font-weight:650}.vp-head{display:flex;justify-content:space-between;gap:28px;align-items:flex-end;margin:10px 0 22px}.vp-head h1{font-size:34px;letter-spacing:-.035em;margin:0 0 7px}.vp-head p{margin:0;color:#667085;line-height:1.55}.vp-progress{width:220px;flex:none;background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:13px 14px}.vp-progress-top{display:flex;justify-content:space-between;font-size:13px;font-weight:750}.vp-progress-track{height:7px;background:#eaecf0;border-radius:999px;margin-top:9px;overflow:hidden}.vp-progress-bar{height:100%;background:#101828;border-radius:999px}.vp-message{margin:0 0 18px;border:1px solid #d0d5dd;background:#fff;border-radius:12px;padding:12px 14px;color:#344054;font-size:13px}.vp-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;align-items:start}.vp-main{display:grid;gap:18px}.vp-side{position:sticky;top:22px;display:grid;gap:14px}.vp-card{background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:24px;box-shadow:0 8px 26px rgba(16,24,40,.035)}.vp-card h2{font-size:19px;margin:0}.vp-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}.vp-card-head p{margin:5px 0 0;color:#667085;font-size:13px;line-height:1.45}.vp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.vp-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.vp-field{display:grid;gap:7px}.vp-field.full{grid-column:1/-1}.vp-label{font-size:12px;font-weight:750;color:#344054}.vp-input,.vp-select,.vp-textarea{width:100%;border:1px solid #d0d5dd;border-radius:10px;padding:11px 12px;font:inherit;font-size:14px;color:#101828;background:#fff;outline:none}.vp-input:focus,.vp-select:focus,.vp-textarea:focus{border-color:#667085;box-shadow:0 0 0 3px rgba(102,112,133,.08)}.vp-textarea{min-height:105px;resize:vertical;line-height:1.55}.vp-chips{display:flex;flex-wrap:wrap;gap:9px}.vp-chip{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:999px;padding:9px 12px;font-size:13px;font-weight:650;cursor:pointer}.vp-chip.on{background:#101828;color:#fff;border-color:#101828}.vp-subsection{padding-top:18px;margin-top:18px;border-top:1px solid #eaecf0}.vp-subtitle{font-size:13px;font-weight:800;color:#344054;margin:0 0 10px}.vp-upload{border:1px dashed #cbd5e1;background:#f8fafc;border-radius:14px;padding:18px}.vp-upload p{margin:0 0 10px;color:#667085;font-size:13px;line-height:1.5}.vp-actions{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.vp-primary,.vp-secondary,.vp-danger{border:0;border-radius:10px;padding:10px 14px;font-weight:750;font-size:13px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.vp-primary{background:#101828;color:#fff}.vp-secondary{background:#fff;color:#344054;border:1px solid #d0d5dd}.vp-danger{background:#fff;color:#b42318;border:1px solid #fecdca}.vp-primary:disabled{opacity:.55}.vp-existing{display:grid;gap:12px;margin-bottom:18px}.vp-entry{border:1px solid #eaecf0;border-radius:14px;padding:16px;background:#fcfcfd}.vp-entry-title{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:12px}.vp-entry-title strong{font-size:14px}.vp-muted{color:#667085;font-size:12px}.vp-side-card{background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:18px}.vp-side-card h3{font-size:14px;margin:0 0 10px}.vp-side-card p{font-size:13px;color:#667085;line-height:1.5;margin:0 0 12px}.vp-summary{display:grid;gap:9px;font-size:13px}.vp-summary-row{display:flex;justify-content:space-between;gap:10px}.vp-summary-row span:first-child{color:#667085}.vp-savebar{display:flex;justify-content:flex-end;margin-top:16px}.vp-check{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:#344054}.vp-check input{margin-top:2px}@media(max-width:900px){.vp-layout{grid-template-columns:1fr}.vp-side{position:static;grid-row:1}.vp-head{align-items:flex-start}.vp-progress{width:190px}}@media(max-width:680px){.vp-page{padding:24px 14px 64px}.vp-head{display:grid}.vp-progress{width:100%}.vp-head h1{font-size:28px}.vp-card{padding:18px}.vp-grid,.vp-grid.three{grid-template-columns:1fr}.vp-field.full{grid-column:auto}.vp-entry-title{display:grid}}
    `}</style>

    <a href="/dashboard" className="vp-back">← Back to dashboard</a>
    <div className="vp-head">
      <div><h1>Build your worker profile</h1><p>This is what employers use to understand your experience after you apply. Identity documents stay private.</p></div>
      <div className="vp-progress"><div className="vp-progress-top"><span>Profile strength</span><span>{completion}%</span></div><div className="vp-progress-track"><div className="vp-progress-bar" style={{width:`${completion}%`}} /></div></div>
    </div>

    {message && <div className="vp-message">{message}</div>}

    <div className="vp-layout">
      <div className="vp-main">
        <form onSubmit={saveProfile} className="vp-main">
          <section className="vp-card">
            <div className="vp-card-head"><div><h2>Professional profile</h2><p>Keep this practical. Employers should understand what you do in seconds.</p></div></div>
            <div className="vp-grid">
              <label className="vp-field"><span className="vp-label">Full name</span><input className="vp-input" value={profile.display_name || ''} onChange={(e) => setProfile({...profile,display_name:e.target.value})} required /></label>
              <label className="vp-field"><span className="vp-label">Professional headline</span><input className="vp-input" placeholder="Warehouse & Logistics Assistant" value={profile.headline || ''} onChange={(e) => setProfile({...profile,headline:e.target.value})} /></label>
              <label className="vp-field"><span className="vp-label">City</span><input className="vp-input" value={profile.city || ''} onChange={(e) => setProfile({...profile,city:e.target.value})} /></label>
              <label className="vp-field"><span className="vp-label">State</span><input className="vp-input" value={profile.state || ''} onChange={(e) => setProfile({...profile,state:e.target.value})} /></label>
              <label className="vp-field full"><span className="vp-label">Professional summary</span><textarea className="vp-textarea" placeholder="Describe your experience, strengths and the kind of work you are looking for." value={profile.professional_summary || ''} onChange={(e) => setProfile({...profile,professional_summary:e.target.value})} /></label>
              <label className="vp-field full"><span className="vp-label">Skills</span><textarea className="vp-textarea" style={{minHeight:82}} placeholder="Inventory management, stock taking, Excel, customer service" value={profile.skills_text || ''} onChange={(e) => setProfile({...profile,skills_text:e.target.value})} /></label>
            </div>
          </section>

          <section className="vp-card">
            <div className="vp-card-head"><div><h2>Job preferences</h2><p>These preferences help VerifiedWork show more relevant vacancies.</p></div></div>
            <div className="vp-grid">
              <label className="vp-field full"><span className="vp-label">Preferred roles</span><input className="vp-input" placeholder="Warehouse Assistant, Logistics Assistant, Store Assistant" value={(profile.preferred_roles || []).join(', ')} onChange={(e) => setProfile({...profile,preferred_roles:e.target.value.split(',').map((x)=>x.trim()).filter(Boolean)})} /></label>
              <label className="vp-field"><span className="vp-label">Availability</span><input className="vp-input" placeholder="Available immediately" value={profile.availability || ''} onChange={(e) => setProfile({...profile,availability:e.target.value})} /></label>
              <div></div>
              <label className="vp-field"><span className="vp-label">Minimum monthly salary (₦)</span><input className="vp-input" type="number" min="0" value={profile.expected_salary_min ?? ''} onChange={(e) => setProfile({...profile,expected_salary_min:e.target.value})} /></label>
              <label className="vp-field"><span className="vp-label">Maximum monthly salary (₦)</span><input className="vp-input" type="number" min="0" value={profile.expected_salary_max ?? ''} onChange={(e) => setProfile({...profile,expected_salary_max:e.target.value})} /></label>
            </div>

            <div className="vp-subsection"><div className="vp-subtitle">Employment type</div><div className="vp-chips">{['full_time','part_time','contract','temporary','gig','internship'].map((v)=><button type="button" key={v} className={`vp-chip ${(profile.preferred_employment_types || []).includes(v)?'on':''}`} onClick={()=>toggleArray('preferred_employment_types',v)}>{formatChoice(v)}</button>)}</div></div>
            <div className="vp-subsection"><div className="vp-subtitle">Work mode</div><div className="vp-chips">{['onsite','hybrid','remote'].map((v)=><button type="button" key={v} className={`vp-chip ${(profile.preferred_work_modes || []).includes(v)?'on':''}`} onClick={()=>toggleArray('preferred_work_modes',v)}>{formatChoice(v)}</button>)}</div></div>
            <div className="vp-subsection"><label className="vp-check"><input type="checkbox" checked={!!profile.willing_to_relocate} onChange={(e)=>setProfile({...profile,willing_to_relocate:e.target.checked})}/><span><strong>Open to relocation</strong><br/><span className="vp-muted">Employers can see that you are willing to move for the right role.</span></span></label></div>

            <div className="vp-savebar"><button className="vp-primary" disabled={saving}>{saving?'Saving…':'Save profile'}</button></div>
          </section>
        </form>

        <section className="vp-card">
          <div className="vp-card-head"><div><h2>Work experience</h2><p>Add roles that help employers understand what you have actually done.</p></div></div>
          {experiences.length > 0 && <div className="vp-existing">{experiences.map((row,index)=><div className="vp-entry" key={row.id}>
            <div className="vp-entry-title"><div><strong>{row.job_title || 'Experience'} · {row.employer_name || ''}</strong><div className="vp-muted">Saved experience #{index+1}</div></div><div className="vp-actions"><button className="vp-secondary" type="button" onClick={()=>void saveExperience(row)}>Save</button><button className="vp-danger" type="button" onClick={()=>void deleteExperience(row.id)}>Remove</button></div></div>
            <div className="vp-grid three">
              <label className="vp-field"><span className="vp-label">Job title</span><input className="vp-input" value={row.job_title || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,job_title:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Employer</span><input className="vp-input" value={row.employer_name || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,employer_name:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Location</span><input className="vp-input" value={row.location || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,location:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Employment type</span><select className="vp-select" value={row.employment_type || 'full_time'} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,employment_type:e.target.value}:r))}>{['full_time','part_time','contract','temporary','gig','internship'].map(v=><option key={v} value={v}>{formatChoice(v)}</option>)}</select></label>
              <label className="vp-field"><span className="vp-label">Start date</span><input className="vp-input" type="date" value={row.start_date || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,start_date:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">End date</span><input className="vp-input" type="date" disabled={!!row.is_current} value={row.end_date || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,end_date:e.target.value}:r))}/></label>
              <label className="vp-field full"><span className="vp-label">Description</span><textarea className="vp-textarea" value={row.description || ''} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,description:e.target.value}:r))}/></label>
              <label className="vp-check full"><input type="checkbox" checked={!!row.is_current} onChange={(e)=>setExperiences(x=>x.map(r=>r.id===row.id?{...r,is_current:e.target.checked}:r))}/><span>I currently work here</span></label>
            </div>
          </div>)}</div>}
          <form onSubmit={addExperience}>
            <div className="vp-subtitle">Add experience</div>
            <div className="vp-grid three">
              <label className="vp-field"><span className="vp-label">Job title</span><input className="vp-input" value={newExp.job_title} onChange={(e)=>setNewExp({...newExp,job_title:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Employer</span><input className="vp-input" value={newExp.employer_name} onChange={(e)=>setNewExp({...newExp,employer_name:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Location</span><input className="vp-input" value={newExp.location} onChange={(e)=>setNewExp({...newExp,location:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Employment type</span><select className="vp-select" value={newExp.employment_type} onChange={(e)=>setNewExp({...newExp,employment_type:e.target.value})}>{['full_time','part_time','contract','temporary','gig','internship'].map(v=><option key={v} value={v}>{formatChoice(v)}</option>)}</select></label>
              <label className="vp-field"><span className="vp-label">Start date</span><input className="vp-input" type="date" value={newExp.start_date} onChange={(e)=>setNewExp({...newExp,start_date:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">End date</span><input className="vp-input" type="date" disabled={newExp.is_current} value={newExp.end_date} onChange={(e)=>setNewExp({...newExp,end_date:e.target.value})}/></label>
              <label className="vp-field full"><span className="vp-label">Description</span><textarea className="vp-textarea" placeholder="What did you do in this role?" value={newExp.description} onChange={(e)=>setNewExp({...newExp,description:e.target.value})}/></label>
              <label className="vp-check full"><input type="checkbox" checked={newExp.is_current} onChange={(e)=>setNewExp({...newExp,is_current:e.target.checked})}/><span>I currently work here</span></label>
            </div>
            <div className="vp-savebar"><button className="vp-secondary">+ Add experience</button></div>
          </form>
        </section>

        <section className="vp-card">
          <div className="vp-card-head"><div><h2>Education</h2><p>Add your most relevant education or training.</p></div></div>
          {education.length > 0 && <div className="vp-existing">{education.map((row)=><div className="vp-entry" key={row.id}>
            <div className="vp-entry-title"><strong>{row.school_name || 'Education'}</strong><div className="vp-actions"><button className="vp-secondary" type="button" onClick={()=>void saveEducation(row)}>Save</button><button className="vp-danger" type="button" onClick={()=>void deleteEducation(row.id)}>Remove</button></div></div>
            <div className="vp-grid three">
              <label className="vp-field"><span className="vp-label">School</span><input className="vp-input" value={row.school_name || ''} onChange={(e)=>setEducation(x=>x.map(r=>r.id===row.id?{...r,school_name:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Qualification</span><input className="vp-input" value={row.qualification || ''} onChange={(e)=>setEducation(x=>x.map(r=>r.id===row.id?{...r,qualification:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Field of study</span><input className="vp-input" value={row.field_of_study || ''} onChange={(e)=>setEducation(x=>x.map(r=>r.id===row.id?{...r,field_of_study:e.target.value}:r))}/></label>
              <label className="vp-field"><span className="vp-label">Graduation year</span><input className="vp-input" type="number" min="1950" max="2100" value={row.graduation_year || ''} onChange={(e)=>setEducation(x=>x.map(r=>r.id===row.id?{...r,graduation_year:e.target.value}:r))}/></label>
            </div>
          </div>)}</div>}
          <form onSubmit={addEducation}>
            <div className="vp-subtitle">Add education</div>
            <div className="vp-grid three">
              <label className="vp-field"><span className="vp-label">School</span><input className="vp-input" value={newEdu.school_name} onChange={(e)=>setNewEdu({...newEdu,school_name:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Qualification</span><input className="vp-input" value={newEdu.qualification} onChange={(e)=>setNewEdu({...newEdu,qualification:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Field of study</span><input className="vp-input" value={newEdu.field_of_study} onChange={(e)=>setNewEdu({...newEdu,field_of_study:e.target.value})}/></label>
              <label className="vp-field"><span className="vp-label">Graduation year</span><input className="vp-input" type="number" min="1950" max="2100" value={newEdu.graduation_year} onChange={(e)=>setNewEdu({...newEdu,graduation_year:e.target.value})}/></label>
            </div>
            <div className="vp-savebar"><button className="vp-secondary">+ Add education</button></div>
          </form>
        </section>
      </div>

      <aside className="vp-side">
        <section className="vp-side-card"><h3>Your profile at a glance</h3><div className="vp-summary"><div className="vp-summary-row"><span>Location</span><strong>{profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Not set'}</strong></div><div className="vp-summary-row"><span>Experience</span><strong>{experiences.length}</strong></div><div className="vp-summary-row"><span>Education</span><strong>{education.length}</strong></div><div className="vp-summary-row"><span>CV</span><strong>{profile.cv_storage_path ? 'Added' : 'Missing'}</strong></div></div></section>
        <section className="vp-side-card"><h3>Private CV</h3><p>Your CV is stored privately and is not exposed as a public file.</p><div className="vp-upload"><p>PDF only, maximum 5 MB.</p><input type="file" accept="application/pdf" onChange={(e)=>void uploadCv(e.target.files?.[0])}/>{cvUrl && <div style={{marginTop:10}}><a className="vp-secondary" href={cvUrl} target="_blank" rel="noreferrer">View current CV</a></div>}</div></section>
        <section className="vp-side-card"><h3>Ready to apply?</h3><p>Once the essentials are filled, browse checked vacancies and apply with this profile.</p><a className="vp-primary" href="/jobs">Find jobs</a></section>
      </aside>
    </div>
  </main>;
}
