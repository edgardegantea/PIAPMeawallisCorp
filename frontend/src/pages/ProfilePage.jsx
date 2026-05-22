import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import {
  Save, Eye, EyeOff, Mail, Phone, Briefcase, Building2, Lock,
  User, Globe, Link2, GitBranch, MapPin, Calendar, Award, Star,
  Plus, Trash2, Edit2, X, ExternalLink, BadgeCheck, Trophy,
  FileText, ChevronRight, CheckCircle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_LABELS = { ADMIN: 'Administrador', DIRECTOR: 'Director', PM: 'Project Manager', TEAM_MEMBER: 'Team Member' };
const ROLE_COLORS = { ADMIN: 'bg-red-100 text-red-700', DIRECTOR: 'bg-purple-100 text-purple-700', PM: 'bg-indigo-100 text-indigo-700', TEAM_MEMBER: 'bg-blue-100 text-blue-700' };

const TABS = [
  { id: 'personal',     label: 'Personal',        icon: User        },
  { id: 'laboral',      label: 'Laboral',          icon: Briefcase   },
  { id: 'contacto',     label: 'Redes y Contacto', icon: Globe       },
  { id: 'documentacion',label: 'Documentación',    icon: FileText    },
  { id: 'certificaciones', label: 'Certificaciones', icon: BadgeCheck },
  { id: 'logros',       label: 'Logros',           icon: Trophy      },
  { id: 'seguridad',    label: 'Seguridad',        icon: Lock        },
];

function profileCompletion(u) {
  const fields = ['first_name','last_name','phone','bio','birth_date',
                  'position','department','years_experience','skills',
                  'linkedin_url','github_url','address','city'];
  const filled = fields.filter((k) => u?.[k]).length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateProfile, refreshUserData } = useAuthStore();
  const [tab, setTab] = useState('personal');

  // ── Form general ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', bio: '', birth_date: '',
    position: '', department: '', years_experience: '', skills: '',
    linkedin_url: '', github_url: '', website_url: '',
    address: '', city: '', state: '', country: '',
    rfc: '', curp: '', nss: '',
    password: '', password_confirm: '',
  });
  const [saving, setSaving]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ── Certificaciones ───────────────────────────────────────────────────────────
  const [certs, setCerts]   = useState([]);
  const [certForm, setCertForm] = useState(null); // null=cerrado, {}=nuevo, {id}=editar
  const [certSaving, setCertSaving] = useState(false);

  // ── Logros ────────────────────────────────────────────────────────────────────
  const [achievements, setAchievements]   = useState([]);
  const [achForm, setAchForm] = useState(null);
  const [achSaving, setAchSaving] = useState(false);

  // ── Confirm ───────────────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(null);

  // ── Skills como array de tags ─────────────────────────────────────────────────
  const skillsList = (form.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || skillsList.includes(s)) { setSkillInput(''); return; }
    setForm((f) => ({ ...f, skills: [...skillsList, s].join(', ') }));
    setSkillInput('');
  };
  const removeSkill = (s) =>
    setForm((f) => ({ ...f, skills: skillsList.filter((x) => x !== s).join(', ') }));

  // ── Inicializar form desde user ───────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setForm({
        first_name:      user.first_name      || '',
        last_name:       user.last_name       || '',
        phone:           user.phone           || '',
        bio:             user.bio             || '',
        birth_date:      user.birth_date      || '',
        position:        user.position        || '',
        department:      user.department      || '',
        years_experience: user.years_experience ?? '',
        skills:          user.skills          || '',
        linkedin_url:    user.linkedin_url    || '',
        github_url:      user.github_url      || '',
        website_url:     user.website_url     || '',
        address:         user.address         || '',
        city:            user.city            || '',
        state:           user.state           || '',
        country:         user.country         || '',
        rfc:             user.rfc             || '',
        curp:            user.curp            || '',
        nss:             user.nss             || '',
        password:        '',
        password_confirm: '',
      });
    }
  }, [user]);

  useEffect(() => {
    loadCerts();
    loadAchievements();
  }, []);

  const loadCerts = () =>
    projectsAPI.getCertifications().then((r) => setCerts(r.data)).catch(() => {});

  const loadAchievements = () =>
    projectsAPI.getAchievements().then((r) => setAchievements(r.data)).catch(() => {});

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Guardar perfil ────────────────────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.password_confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.password_confirm;
      if (!payload.password) delete payload.password;
      if (payload.years_experience === '') payload.years_experience = null;
      await updateProfile(payload);
      toast.success('Perfil actualizado correctamente');
      setForm((f) => ({ ...f, password: '', password_confirm: '' }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD Certificaciones ──────────────────────────────────────────────────────
  const CERT_EMPTY = { name: '', issuer: '', issued_date: '', expiry_date: '', credential_id: '', credential_url: '' };

  const saveCert = async (e) => {
    e.preventDefault();
    setCertSaving(true);
    try {
      if (certForm?.id) {
        await projectsAPI.updateCertification(certForm.id, certForm);
        toast.success('Certificación actualizada');
      } else {
        await projectsAPI.createCertification(certForm);
        toast.success('Certificación agregada');
      }
      setCertForm(null);
      loadCerts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally { setCertSaving(false); }
  };

  const deleteCert = (id, name) => setConfirm({
    title: 'Eliminar certificación',
    body: `¿Eliminar "${name}"?`,
    danger: true,
    onConfirm: async () => {
      await projectsAPI.deleteCertification(id);
      toast.success('Certificación eliminada');
      loadCerts();
    },
  });

  // ── CRUD Logros ───────────────────────────────────────────────────────────────
  const ACH_EMPTY = { title: '', description: '', achievement_date: '' };

  const saveAch = async (e) => {
    e.preventDefault();
    setAchSaving(true);
    try {
      if (achForm?.id) {
        await projectsAPI.updateAchievement(achForm.id, achForm);
        toast.success('Logro actualizado');
      } else {
        await projectsAPI.createAchievement(achForm);
        toast.success('Logro agregado');
      }
      setAchForm(null);
      loadAchievements();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally { setAchSaving(false); }
  };

  const deleteAch = (id, title) => setConfirm({
    title: 'Eliminar logro',
    body: `¿Eliminar "${title}"?`,
    danger: true,
    onConfirm: async () => {
      await projectsAPI.deleteAchievement(id);
      toast.success('Logro eliminado');
      loadAchievements();
    },
  });

  // ── Computed ──────────────────────────────────────────────────────────────────
  const completion  = profileCompletion(user);
  const initials    = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase()
    || user?.username?.[0]?.toUpperCase() || '?';
  const roleColor   = ROLE_COLORS[user?.role] ?? 'bg-slate-100 text-slate-600';
  const roleLabel   = ROLE_LABELS[user?.role] ?? user?.role ?? '';

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Mi Perfil</h1>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl px-6 py-8 mb-6">
          <div className="flex flex-wrap items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/40
              flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 text-white min-w-0">
              <p className="text-xl font-bold truncate">
                {user?.first_name || user?.username} {user?.last_name || ''}
              </p>
              <p className="text-indigo-200 text-sm flex items-center gap-1.5 mt-0.5">
                <Mail size={13} /> {user?.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20">
                  {roleLabel}
                </span>
                <span className="text-xs text-indigo-200">@{user?.username}</span>
                {user?.position && (
                  <span className="text-xs text-indigo-200 flex items-center gap-1">
                    <Briefcase size={11} /> {user.position}
                  </span>
                )}
              </div>
            </div>

            {/* Completion */}
            <div className="flex-shrink-0 text-center text-white">
              <p className="text-3xl font-bold">{completion}%</p>
              <p className="text-xs text-indigo-200 mt-0.5">Perfil completado</p>
              <div className="mt-2 w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all flex-1 justify-center min-w-[100px]
                ${tab === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'}`}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════
            TABS CONTENT
        ════════════════════════════════════════════ */}
        <form onSubmit={saveProfile}>

          {/* ── PERSONAL ──────────────────────────────── */}
          {tab === 'personal' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <SectionTitle icon={User} text="Información Personal" />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required>
                  <input value={form.first_name} onChange={(e) => setF('first_name', e.target.value)}
                    placeholder="Juan"
                    className={inputCls} />
                </Field>
                <Field label="Apellido" required>
                  <input value={form.last_name} onChange={(e) => setF('last_name', e.target.value)}
                    placeholder="Pérez"
                    className={inputCls} />
                </Field>
              </div>

              <Field label="Sobre mí / Biografía">
                <textarea value={form.bio} onChange={(e) => setF('bio', e.target.value)}
                  placeholder="Cuéntanos un poco sobre ti, tu experiencia y especialidades..."
                  rows={4}
                  className={`${inputCls} resize-none`} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha de nacimiento">
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" value={form.birth_date} onChange={(e) => setF('birth_date', e.target.value)}
                      className={`${inputCls} pl-9`} />
                  </div>
                </Field>
                <Field label="Teléfono">
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={form.phone} onChange={(e) => setF('phone', e.target.value)}
                      placeholder="+52 55 XXXX XXXX"
                      className={`${inputCls} pl-9`} />
                  </div>
                </Field>
              </div>

              <div className="pt-2 flex justify-end">
                <SaveButton loading={saving} />
              </div>
            </div>
          )}

          {/* ── LABORAL ───────────────────────────────── */}
          {tab === 'laboral' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <SectionTitle icon={Briefcase} text="Información Laboral" />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cargo / Puesto">
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.position} onChange={(e) => setF('position', e.target.value)}
                      placeholder="Desarrollador Senior, QA Lead..."
                      className={`${inputCls} pl-9`} />
                  </div>
                </Field>
                <Field label="Departamento">
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.department} onChange={(e) => setF('department', e.target.value)}
                      placeholder="Ingeniería, QA, Consultoría..."
                      className={`${inputCls} pl-9`} />
                  </div>
                </Field>
              </div>

              <Field label="Años de experiencia">
                <input type="number" min="0" max="60" value={form.years_experience}
                  onChange={(e) => setF('years_experience', e.target.value)}
                  placeholder="Ej. 5"
                  className={`${inputCls} w-32`} />
              </Field>

              {/* Skills tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Habilidades / Tecnologías
                </label>
                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {skillsList.map((s) => (
                      <span key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50
                          text-indigo-700 rounded-full text-xs font-medium">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)}
                          className="text-indigo-400 hover:text-indigo-700 ml-0.5">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Ej. React, Python, SQL… (Enter para agregar)"
                    className={`${inputCls} flex-1`} />
                  <button type="button" onClick={addSkill}
                    className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg
                      text-sm font-medium transition-colors flex-shrink-0">
                    Agregar
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <SaveButton loading={saving} />
              </div>
            </div>
          )}

          {/* ── REDES Y CONTACTO ──────────────────────── */}
          {tab === 'contacto' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <SectionTitle icon={Globe} text="Redes Profesionales y Contacto" />

              <div className="grid grid-cols-1 gap-4">
                <Field label="LinkedIn">
                  <div className="relative">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input value={form.linkedin_url} onChange={(e) => setF('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/tu-perfil"
                      className={`${inputCls} pl-9`} />
                    {form.linkedin_url && (
                      <a href={form.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </Field>

                <Field label="GitHub">
                  <div className="relative">
                    <GitBranch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" />
                    <input value={form.github_url} onChange={(e) => setF('github_url', e.target.value)}
                      placeholder="https://github.com/tu-usuario"
                      className={`${inputCls} pl-9`} />
                    {form.github_url && (
                      <a href={form.github_url} target="_blank" rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </Field>

                <Field label="Sitio web / Portafolio">
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.website_url} onChange={(e) => setF('website_url', e.target.value)}
                      placeholder="https://mi-sitio.com"
                      className={`${inputCls} pl-9`} />
                    {form.website_url && (
                      <a href={form.website_url} target="_blank" rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </Field>
              </div>

              <hr className="border-slate-100" />
              <SectionTitle icon={MapPin} text="Dirección" small />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Calle y número">
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={form.address} onChange={(e) => setF('address', e.target.value)}
                        placeholder="Av. Insurgentes Sur 1234, Col. Del Valle"
                        className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                </div>
                <Field label="Ciudad">
                  <input value={form.city} onChange={(e) => setF('city', e.target.value)}
                    placeholder="Ciudad de México"
                    className={inputCls} />
                </Field>
                <Field label="Estado / Provincia">
                  <input value={form.state} onChange={(e) => setF('state', e.target.value)}
                    placeholder="CDMX"
                    className={inputCls} />
                </Field>
                <Field label="País">
                  <input value={form.country} onChange={(e) => setF('country', e.target.value)}
                    placeholder="México"
                    className={inputCls} />
                </Field>
              </div>

              <div className="pt-2 flex justify-end">
                <SaveButton loading={saving} />
              </div>
            </div>
          )}

          {/* ── DOCUMENTACIÓN ─────────────────────────── */}
          {tab === 'documentacion' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <SectionTitle icon={FileText} text="Documentación Personal" />
              <p className="text-sm text-slate-500 -mt-3">
                Esta información es confidencial y solo visible para ti y administradores.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="RFC">
                  <input value={form.rfc} onChange={(e) => setF('rfc', e.target.value.toUpperCase())}
                    placeholder="XXXX000000XXX"
                    maxLength={13}
                    className={`${inputCls} font-mono uppercase`} />
                </Field>
                <Field label="CURP">
                  <input value={form.curp} onChange={(e) => setF('curp', e.target.value.toUpperCase())}
                    placeholder="XXXX000000XXXXXX00"
                    maxLength={18}
                    className={`${inputCls} font-mono uppercase`} />
                </Field>
                <Field label="NSS (IMSS)">
                  <input value={form.nss} onChange={(e) => setF('nss', e.target.value)}
                    placeholder="00000000000"
                    maxLength={11}
                    className={`${inputCls} font-mono`} />
                </Field>
              </div>

              <div className="pt-2 flex justify-end">
                <SaveButton loading={saving} />
              </div>
            </div>
          )}
        </form>

        {/* ── CERTIFICACIONES (fuera del form general) ──── */}
        {tab === 'certificaciones' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <SectionTitle icon={BadgeCheck} text={`Certificaciones (${certs.length})`} />
              <button onClick={() => setCertForm({ ...CERT_EMPTY })}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
                  text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Agregar
              </button>
            </div>

            {certs.length === 0 ? (
              <EmptyState icon={BadgeCheck}
                text="Sin certificaciones registradas"
                action={() => setCertForm({ ...CERT_EMPTY })}
                actionLabel="Agregar primera certificación" />
            ) : (
              <div className="space-y-3">
                {certs.map((c) => (
                  <div key={c.id}
                    className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Award size={18} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      {c.issuer && <p className="text-sm text-slate-500">{c.issuer}</p>}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                        {c.issued_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> Emitida: {c.issued_date}
                          </span>
                        )}
                        {c.expiry_date && (
                          <span className={`flex items-center gap-1 ${new Date(c.expiry_date) < new Date() ? 'text-red-500' : ''}`}>
                            <Calendar size={11} /> Vence: {c.expiry_date}
                          </span>
                        )}
                        {c.credential_id && (
                          <span>ID: <span className="font-mono">{c.credential_id}</span></span>
                        )}
                        {c.credential_url && (
                          <a href={c.credential_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-500 hover:underline">
                            <ExternalLink size={11} /> Ver credencial
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setCertForm({ ...c })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteCert(c.id, c.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOGROS ──────────────────────────────────── */}
        {tab === 'logros' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <SectionTitle icon={Trophy} text={`Logros y Reconocimientos (${achievements.length})`} />
              <button onClick={() => setAchForm({ ...ACH_EMPTY })}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
                  text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Agregar
              </button>
            </div>

            {achievements.length === 0 ? (
              <EmptyState icon={Trophy}
                text="Sin logros registrados"
                action={() => setAchForm({ ...ACH_EMPTY })}
                actionLabel="Agregar primer logro" />
            ) : (
              <div className="space-y-3">
                {achievements.map((a) => (
                  <div key={a.id}
                    className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-200 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Star size={18} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{a.title}</p>
                      {a.achievement_date && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {a.achievement_date}
                        </p>
                      )}
                      {a.description && (
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{a.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setAchForm({ ...a })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteAch(a.id, a.title)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SEGURIDAD ───────────────────────────────── */}
        {tab === 'seguridad' && (
          <form onSubmit={saveProfile}>
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <SectionTitle icon={Lock} text="Cambiar Contraseña" />
              <p className="text-sm text-slate-500 -mt-3">
                Deja los campos vacíos si no deseas cambiar tu contraseña.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <Field label="Nueva contraseña">
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={(e) => setF('password', e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirmar contraseña">
                  <input type={showPass ? 'text' : 'password'}
                    value={form.password_confirm} onChange={(e) => setF('password_confirm', e.target.value)}
                    placeholder="Repetir contraseña"
                    className={`${inputCls}
                      ${form.password_confirm && form.password !== form.password_confirm
                        ? 'border-red-400 bg-red-50'
                        : ''}`} />
                  {form.password_confirm && form.password !== form.password_confirm && (
                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                  )}
                </Field>
              </div>

              <div className="pt-2 flex justify-end">
                <SaveButton loading={saving} label="Cambiar Contraseña" />
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── Modal Certificación ─────────────────────────────────────────── */}
      {certForm !== null && (
        <Modal title={certForm.id ? 'Editar Certificación' : 'Nueva Certificación'}
          onClose={() => setCertForm(null)}>
          <form onSubmit={saveCert} className="space-y-4">
            <Field label="Nombre de la certificación" required>
              <input required value={certForm.name}
                onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                placeholder="AWS Solutions Architect, SCRUM Master..."
                className={inputCls} />
            </Field>
            <Field label="Institución emisora">
              <input value={certForm.issuer || ''}
                onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                placeholder="Amazon, PMI, Coursera..."
                className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de emisión">
                <input type="date" value={certForm.issued_date || ''}
                  onChange={(e) => setCertForm({ ...certForm, issued_date: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Fecha de vencimiento">
                <input type="date" value={certForm.expiry_date || ''}
                  onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>
            <Field label="ID / Folio de credencial">
              <input value={certForm.credential_id || ''}
                onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                placeholder="ABC-12345"
                className={`${inputCls} font-mono`} />
            </Field>
            <Field label="URL de verificación">
              <input type="url" value={certForm.credential_url || ''}
                onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                placeholder="https://..."
                className={inputCls} />
            </Field>
            <ModalActions onCancel={() => setCertForm(null)} saving={certSaving}
              label={certForm.id ? 'Actualizar' : 'Agregar'} />
          </form>
        </Modal>
      )}

      {/* ── Modal Logro ────────────────────────────────────────────────── */}
      {achForm !== null && (
        <Modal title={achForm.id ? 'Editar Logro' : 'Nuevo Logro'}
          onClose={() => setAchForm(null)}>
          <form onSubmit={saveAch} className="space-y-4">
            <Field label="Título del logro" required>
              <input required value={achForm.title}
                onChange={(e) => setAchForm({ ...achForm, title: e.target.value })}
                placeholder="Premio al mejor empleado, Proyecto más innovador..."
                className={inputCls} />
            </Field>
            <Field label="Fecha">
              <input type="date" value={achForm.achievement_date || ''}
                onChange={(e) => setAchForm({ ...achForm, achievement_date: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="Descripción">
              <textarea value={achForm.description || ''}
                onChange={(e) => setAchForm({ ...achForm, description: e.target.value })}
                placeholder="Describe el logro y su impacto..."
                rows={3}
                className={`${inputCls} resize-none`} />
            </Field>
            <ModalActions onCancel={() => setAchForm(null)} saving={achSaving}
              label={achForm.id ? 'Actualizar' : 'Agregar'} />
          </form>
        </Modal>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </Layout>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, text, small }) {
  return (
    <div className={`flex items-center gap-2 ${small ? 'mb-0' : 'mb-2'}`}>
      <Icon size={small ? 14 : 16} className="text-indigo-600 flex-shrink-0" />
      <h3 className={`font-semibold text-slate-700 ${small ? 'text-sm' : 'text-base'}`}>{text}</h3>
    </div>
  );
}

function SaveButton({ loading, label = 'Guardar Cambios' }) {
  return (
    <button type="submit" disabled={loading}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
        disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
      <Save size={15} />
      {loading ? 'Guardando...' : label}
    </button>
  );
}

function EmptyState({ icon: Icon, text, action, actionLabel }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <Icon size={36} className="mx-auto mb-3 opacity-25" />
      <p className="text-sm">{text}</p>
      {action && (
        <button onClick={action}
          className="mt-3 text-sm text-indigo-600 hover:underline font-medium">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, saving, label }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
      <button type="button" onClick={onCancel}
        className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
          disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
        <Save size={14} />
        {saving ? 'Guardando...' : label}
      </button>
    </div>
  );
}

// Constantes usadas en los modals (necesitan estar disponibles fuera del scope del componente)
const CERT_EMPTY = { name: '', issuer: '', issued_date: '', expiry_date: '', credential_id: '', credential_url: '' };
const ACH_EMPTY  = { title: '', description: '', achievement_date: '' };
