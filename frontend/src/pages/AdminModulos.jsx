import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminModulos() {
  const [modulos, setModulos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
        const [mods, sis] = await Promise.all([
            api.get("/modulos/"),
            api.get("/sistemas/")
        ]);
        setModulos(mods);
        setSistemas(sis);
        const ativos = sis.filter(s => s.ativo);
        if (ativos.length > 0) setForm(f => ({ ...f, sistema_id: ativos[0].id }));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, sistema_id: parseInt(form.sistema_id) };
      if (editingId) await api.put(`/modulos/${editingId}`, payload);
      else await api.post("/modulos/", { ...payload, ativo: true });
      
      alert("Salvo com sucesso!");
      handleCancel();
      const updatedMods = await api.get("/modulos/");
      setModulos(updatedMods);
    } catch (error) { alert("Erro ao salvar."); }
  };

  const handleCancel = () => {
      setEditingId(null);
      setForm(f => ({...f, nome:'', descricao:''})); 
  };

  const handleSelectRow = (modulo) => {
      setForm({nome: modulo.nome, descricao: modulo.descricao, sistema_id: modulo.sistema_id});
      setEditingId(modulo.id);
  };

  const toggleActive = async (modulo) => {
      try {
          await api.put(`/modulos/${modulo.id}`, { ativo: !modulo.ativo });
          const updatedMods = await api.get("/modulos/");
          setModulos(updatedMods);
      } catch(e) { alert("Erro ao alterar status."); }
  };

  const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || id;
  const sistemasAtivos = sistemas.filter(s => s.ativo);

  return (
    <main className="container grid">
      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
                <label>Sistema Pai</label>
                <select value={form.sistema_id} onChange={e => setForm({...form, sistema_id: e.target.value})} required>
                    {sistemasAtivos.length === 0 && <option value="">Nenhum sistema ativo disponível</option>}
                    {sistemasAtivos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            </div>
            <div>
                <label>Nome do Módulo</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Contas a Pagar" />
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Descrição</label>
                <input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            </div>
          </div>
          <div className="actions" style={{marginTop: '15px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Atualizar' : 'Salvar'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="btn" style={{marginLeft:'10px'}}>Cancelar Seleção</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Módulos Cadastrados</h2>
        <div className="table-wrap">
            <table>
                <thead><tr><th>Sistema</th><th>Módulo</th><th>Status</th></tr></thead>
                <tbody>
                    {modulos.map(m => (
                        <tr 
                            key={m.id} 
                            onClick={() => handleSelectRow(m)}
                            className={editingId === m.id ? 'selected' : 'selectable'}
                            style={{opacity: m.ativo ? 1 : 0.6}}
                        >
                            <td><span className="badge" style={{backgroundColor: '#e0f2fe', color: '#0369a1'}}>{getSistemaName(m.sistema_id)}</span></td>
                            <td><strong>{m.nome}</strong></td>
                            
                            <td>
                                <span 
                                    onClick={(e) => { e.stopPropagation(); toggleActive(m); }}
                                    className="badge"
                                    title="Clique para alternar"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: m.ativo ? '#eef2ff' : '#fee2e2', 
                                        color: m.ativo ? '#3730a3' : '#b91c1c'
                                    }}
                                >
                                    {m.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>
    </main>
  );
}