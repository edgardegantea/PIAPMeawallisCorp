import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, ExternalLink } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const STATUS_COLORS = {
  BORRADOR:   'bg-slate-100  text-slate-600',
  REVISION:   'bg-amber-100  text-amber-700',
  ACTIVO:     'bg-emerald-100 text-emerald-700',
  VENCIDO:    'bg-red-100    text-red-700',
  CANCELADO:  'bg-red-100    text-red-700',
  COMPLETADO: 'bg-blue-100   text-blue-700',
};

const CONTRACT_TYPES = ['SERVICIO', 'SUMINISTRO', 'MANTENIMIENTO', 'CONSULTORIA', 'LICENCIA', 'OTRO'];
const STATUSES       = ['BORRADOR', 'REVISION', 'ACTIVO', 'VENCIDO', 'CANCELADO', 'COMPLETADO'];

const EMPTY = {
  title: '', contract_number: '', party_name: '', contract_type: 'SERVICIO',
  status: 'BORRADOR', amount: '', currency: 'MXN',
  start_date: '', end_date: '', signed_date: '', description: '', file_url: '', notes: '',
};

export default function ContractList({ projectId, isManager = false }) {
  const [contracts, setContracts] = useState([]);
  const [form, setForm]           = useState({ ...EMPTY });
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [confirm, setConfirm]     = useState(null);

  const load = () =>
    projectsAPI.getContracts(projectId)
      .then((r) => setContracts(r.data.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createContract(projectId, { ...form, amount: form.amount || null });
      toast.success('Contrato registrado');
      setForm({ ...EMPTY });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear contrato'); }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditForm({
      title: c.title, contract_number: c.contract_number || '', party_name: c.party_name || '',
      contract_type: c.contract_type, status: c.status, amount: c.amount || '',
      currency: c.currency, start_date: c.start_date || '', end_date: c.end_date || '',
      signed_date: c.signed_date || '', description: c.description || '',
      file_url: c.file_url || '', notes: c.notes || '',
    });
  };

  const saveEdit = async () => {
    try {
      await projectsAPI.updateContract(editId, { ...editForm, amount: editForm.amount || null });
      toast.success('Contrato actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar contrato',
    body: '¿Eliminar este contrato del proyecto?',
    onConfirm: async () => {
      try { await projectsAPI.deleteContract(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const activeCount = contracts.filter((c) => c.status === 'ACTIVO').length;

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Contratos ({contracts.length})</h3>
          {activeCount > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">{activeCount} contrato{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo Contrato
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Contrato de desarrollo de software"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de contrato</label>
              <input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                placeholder="Ej. CONT-2026-001"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraparte</label>
              <input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })}
                placeholder="Nombre de la empresa o persona"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto</label>
              <div className="flex gap-1">
                <input value={form.amount} type="number" min="0" step="0.01"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none">
                  <option>MXN</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de firma</label>
              <input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Resumen del alcance del contrato..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">URL del archivo</label>
              <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                placeholder="https://..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Registrar</button>
          </div>
        </form>
      )}

      {/* List */}
      {contracts.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin contratos registrados</p>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const isEdit   = editId === c.id;
            const isExpired = c.status !== 'CANCELADO' && c.status !== 'COMPLETADO' && c.end_date && new Date(c.end_date) < new Date();
            return (
              <div key={c.id}
                className={`border rounded-xl p-4 bg-white transition-colors ${isExpired ? 'border-red-200' : 'border-slate-200'}`}>
                {isEdit ? (
                  <EditContractForm form={editForm} setForm={setEditForm}
                    onSave={saveEdit} onCancel={() => setEditId(null)} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 truncate">{c.title}</span>
                          {c.contract_number && (
                            <span className="text-xs font-mono text-slate-400">{c.contract_number}</span>
                          )}
                        </div>
                        {c.party_name && (
                          <p className="text-xs text-slate-500 mt-0.5">{c.party_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                        {isManager && (
                          <>
                            <button onClick={() => startEdit(c)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => remove(c.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {c.contract_type}
                      </span>
                      {c.amount && (
                        <span className="font-semibold text-slate-700">
                          {c.currency} {Number(c.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {c.start_date && <span>Inicio: {c.start_date}</span>}
                      {c.end_date && (
                        <span className={isExpired ? 'text-red-500 font-medium' : ''}>
                          {isExpired ? '⚠ Vencido: ' : 'Fin: '}{c.end_date}
                        </span>
                      )}
                      {c.signed_date && <span>Firmado: {c.signed_date}</span>}
                    </div>

                    {c.description && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1.5 line-clamp-2">
                        {c.description}
                      </p>
                    )}

                    {c.file_url && (
                      <a href={c.file_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-2">
                        <ExternalLink size={11} /> Ver archivo
                      </a>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function EditContractForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-2">
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="grid grid-cols-2 gap-2">
        <input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
          placeholder="Número de contrato"
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })}
          placeholder="Contraparte"
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none">
          {['SERVICIO', 'SUMINISTRO', 'MANTENIMIENTO', 'CONSULTORIA', 'LICENCIA', 'OTRO'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none">
          {['BORRADOR', 'REVISION', 'ACTIVO', 'VENCIDO', 'CANCELADO', 'COMPLETADO'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-1">
          <input value={form.amount} type="number" min="0" step="0.01"
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Monto"
            className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none">
            <option>MXN</option><option>USD</option><option>EUR</option>
          </select>
        </div>
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })}
          placeholder="Fecha firma"
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
      </div>
      <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción..."
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none resize-none" />
      <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
        placeholder="URL del archivo"
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        <button onClick={onSave}
          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
          <Check size={12} /> Guardar
        </button>
      </div>
    </div>
  );
}
