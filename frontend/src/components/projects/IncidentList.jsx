import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, Download } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { downloadCSV } from '../../utils/csv';

const SEV_COLORS = {
  BAJA:   'bg-green-100  text-green-700',
  MEDIA:  'bg-blue-100   text-blue-700',
  ALTA:   'bg-amber-100  text-amber-700',
  CRITICA:'bg-red-100    text-red-700',
};
const STATUS_COLORS = {
  ABIERTA:    'bg-red-100    text-red-700',
  EN_REVISION:'bg-amber-100  text-amber-700',
  RESUELTA:   'bg-blue-100   text-blue-700',
  CERRADA:    'bg-emerald-100 text-emerald-700',
};

const EMPTY = { project_id: '', title: '', description: '', severity: 'MEDIA', status: 'ABIERTA', assigned_to: '' };

export default function IncidentList({ projectId, isManager = false }) {
  const [incidents, setIncidents] = useState([]);
  const [members, setMembers]     = useState([]);
  const [form, setForm]           = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [confirm, setConfirm]     = useState(null);
  const [filter, setFilter]       = useState('');

  const load = () => projectsAPI.getIncidents(projectId).then((r) => setIncidents(r.data)).finally(() => setLoading(false));
  useEffect(() => {
    load();
    projectsAPI.getMembers(projectId).then((r) => setMembers(r.data)).catch(() => {});
  }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createIncident(form);
      toast.success('Incidencia registrada');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar incidencia',
    body: '¿Eliminar esta incidencia del proyecto?',
    onConfirm: async () => {
      try { await projectsAPI.deleteIncident(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const changeStatus = async (id, status) => {
    try { await projectsAPI.updateIncident(id, { status }); load(); } catch {}
  };

  const startEdit  = (inc) => { setEditId(inc.id); setEditForm({ ...inc }); };
  const saveEdit   = async () => {
    try {
      await projectsAPI.updateIncident(editId, editForm);
      toast.success('Incidencia actualizada');
      setEditId(null);
      load();
    } catch { toast.error('Error'); }
  };

  const displayed = filter ? incidents.filter((i) => i.status === filter) : incidents;
  const openCount = incidents.filter((i) => i.status === 'ABIERTA').length;
  const critCount = incidents.filter((i) => i.severity === 'CRITICA' && i.status !== 'CERRADA').length;

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Incidencias ({incidents.length})</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {openCount} abierta{openCount !== 1 ? 's' : ''}
            {critCount > 0 && <span className="text-red-600 font-medium"> · {critCount} crítica{critCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {incidents.length > 0 && (
            <button onClick={() => downloadCSV(incidents, [
              { key: 'title',       label: 'Título' },
              { key: 'severity',    label: 'Severidad' },
              { key: 'status',      label: 'Estado' },
              { key: 'description', label: 'Descripción' },
            ], 'incidencias')}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Download size={14} /> CSV
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <Plus size={14} /> Nueva Incidencia
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'ABIERTA', 'EN_REVISION', 'RESUELTA', 'CERRADA'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
              ${filter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Severidad</label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado inicial</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="ABIERTA">Abierta</option><option value="EN_REVISION">En Revisión</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asignado a</label>
            <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción *</label>
            <textarea required rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el problema, cómo reproducirlo y el impacto observado..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Registrar</button>
          </div>
        </form>
      )}

      {displayed.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          {filter ? `Sin incidencias con estado "${filter}"` : 'Sin incidencias reportadas'}
        </p>
      ) : (
        <div className="space-y-3">
          {displayed.map((inc) => (
            <div key={inc.id}
              className={`border rounded-xl p-4 transition-colors
                ${inc.status === 'CERRADA' ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200 bg-white'}`}>
              {editId === inc.id ? (
                <div className="space-y-2">
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editForm.severity} onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                    </select>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="ABIERTA">Abierta</option><option value="EN_REVISION">En Revisión</option>
                      <option value="RESUELTA">Resuelta</option><option value="CERRADA">Cerrada</option>
                    </select>
                  </div>
                  <textarea rows={2} value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none resize-none" />
                  <select value={editForm.assigned_to || ''}
                    onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value || null })}
                    className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none w-full">
                    <option value="">Sin asignar</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                    <button onClick={saveEdit}
                      className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                      <Check size={12} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{inc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{inc.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_COLORS[inc.severity]}`}>
                        {inc.severity}
                      </span>
                      {isManager && (
                        <button onClick={() => startEdit(inc)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isManager && (
                        <button onClick={() => remove(inc.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inc.status]}`}>
                      {inc.status.replace('_', ' ')}
                    </span>
                    <select value={inc.status} onChange={(e) => changeStatus(inc.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-0.5 focus:outline-none ml-auto">
                      <option value="ABIERTA">Abierta</option><option value="EN_REVISION">En Revisión</option>
                      <option value="RESUELTA">Resuelta</option><option value="CERRADA">Cerrada</option>
                    </select>
                  </div>
                  {inc.created_at && (
                    <p className="text-xs text-slate-400 mt-1">
                      Reportada: {new Date(inc.created_at).toLocaleDateString('es')}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
