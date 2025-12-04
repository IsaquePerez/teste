import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  
  const [form, setForm] = useState({
    nome: '', 
    descricao: '', 
    modulo_id: '', 
    responsavel_id: '',
    status: 'ativo'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
        const [projData, modData, userData] = await Promise.all([
            api.get("/projetos/"),
            api.get("/modulos/"),
            api.get("/usuarios/") 
        ]);

        const sortedProjetos = (projData || []).sort((a, b) => {
            if (a.status === 'finalizado' && b.status !== 'finalizado') return 1;
            if (a.status !== 'finalizado' && b.status === 'finalizado') return -1;
            return a.nome.localeCompare(b.nome);
        });

        setProjetos(sortedProjetos);
        setModulos(modData.filter(m => m.ativo !== false));
        setUsuarios(userData);
        
        if (modData.length > 0) setForm(f => ({ ...f, modulo_id: modData[0].id }));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modulo_id) return alert("Selecione um módulo!");

    const payload = {
        ...form,
        modulo_id: parseInt(form.modulo_id),
        sistema_id: modulos.find(m => m.id == form.modulo_id)?.sistema_id,
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null
    };

    try {
        if (editingId) await api.put(`/projetos/${editingId}`, payload);
        else await api.post("/projetos/", payload);
        
        alert("Projeto salvo!");
        handleCancel();
        loadAll(); 
    } catch (err) { alert("Erro ao salvar: " + err.message); }
  };

  const handleCancel = () => {
      setEditingId(null);
      setForm(f => ({ ...f, nome: '', descricao: '', status: 'ativo' }));
  };

  const handleSelectRow = (projeto) => {
      if (projeto.status === 'finalizado') return alert("Reative o projeto clicando no status para editá-lo.");

      setForm({
          nome: projeto.nome,
          descricao: projeto.descricao || '',
          modulo_id: projeto.modulo_id,
          responsavel_id: projeto.responsavel_id || '',
          status: projeto.status
      });
      setEditingId(projeto.id);
  };

  const cycleStatus = async (projeto) => {
      const fluxo = { 'ativo': 'pausado', 'pausado': 'finalizado', 'finalizado': 'ativo' };
      const novoStatus = fluxo[projeto.status] || 'ativo';
      
      try {
          await api.put(`/projetos/${projeto.id}`, { 
              ...projeto, 
              status: novoStatus 
          });
          loadAll(); 
      } catch(e) { alert("Erro ao mudar status."); }
  };

  const getModuloName = (id) => modulos.find(m => m.id === id)?.nome || '-';
  
  const getStatusStyle = (status) => {
      switch(status) {
          case 'ativo': return { bg: '#dcfce7', color: '#166534' }; 
          case 'pausado': return { bg: '#fef3c7', color: '#92400e' }; 
          case 'finalizado': return { bg: '#f1f5f9', color: '#64748b' }; 
          default: return { bg: '#f3f4f6', color: '#6b7280' };
      }
  };

  const renderResponsavel = (id) => {
      if (!id) return <span style={{color: '#cbd5e1'}}>-</span>;
      const user = usuarios.find(u => u.id === id);
      if (!user) return <span style={{color: '#94a3b8'}}>Desconhecido</span>;
      if (user.ativo === false) return <span className="badge" style={{backgroundColor: '#fee2e2', color: '#b91c1c'}}>{user.nome} (Inativo)</span>;
      return <span className="badge" style={{backgroundColor: '#eef2ff', color: '#3730a3'}}>{user.nome}</span>;
  };

  const usuariosAtivos = usuarios.filter(u => u.ativo !== false);

  return (
    <main className="container grid">
      {/* Estilo local para o Hover do Status */}
      <style>{`
        .status-hover {
          transition: all 0.2s ease-in-out;
        }
        .status-hover:hover {
          filter: brightness(0.95); /* Escurece levemente */
          transform: scale(1.05);   /* Aumenta um pouquinho */
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
          tr.selectable {
            transition: background-color 0.2s;
        }
        tr.selectable:hover {
            background-color: #f1f5f9 !important; /* Cinza claro ao passar o mouse */
            cursor: pointer;
        }
        
        /* Linha selecionada (Azul claro fixo) */
        tr.selected {
            background-color: #e0f2fe !important; 
        }
      `}</style>

      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
                <label>Módulo Pai</label>
                <select value={form.modulo_id} onChange={e => setForm({...form, modulo_id: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {modulos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
            </div>
            <div>
                <label>Responsável</label>
                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                    <option value="">Sem responsável</option>
                    {usuariosAtivos.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Nome do Projeto</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Refatoração do Login" />
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            </div>
          </div>
          <div className="actions" style={{marginTop:'15px', display:'flex', gap:'10px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Atualizar' : 'Salvar'}</button>
            {editingId && <button type="button" className="btn" onClick={handleCancel}>Cancelar Seleção</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Lista de Projetos</h2>
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Projeto</th>
                        <th>Módulo</th>
                        <th>Status (Clique para mudar)</th>
                        <th>Responsável</th>
                    </tr>
                </thead>
                <tbody>
                    {projetos.map(p => {
                        const style = getStatusStyle(p.status);
                        const isFinalizado = p.status === 'finalizado';
                        
                        return (
                            <tr 
                                key={p.id} 
                                onClick={() => handleSelectRow(p)}
                                className={editingId === p.id ? 'selected' : 'selectable'}
                                title="Clique na linha para editar, ou no status para alterar estado"
                                style={{ 
                                    opacity: isFinalizado ? 0.6 : 1, 
                                    backgroundColor: isFinalizado ? '#f9fafb' : 'transparent'
                                }}
                            >
                                <td><strong>{p.nome}</strong></td>
                                <td>{getModuloName(p.modulo_id)}</td>
                                
                                <td>
                                    <span 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            cycleStatus(p); 
                                        }}
                                        className="badge status-hover" // Adicionei a classe aqui
                                        style={{
                                            backgroundColor: style.bg, 
                                            color: style.color,
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            border: '1px solid transparent',
                                            display: 'inline-block',
                                            minWidth: '80px',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {p.status}
                                    </span>
                                </td>
                                
                                <td>{renderResponsavel(p.responsavel_id)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </section>
    </main>
  );
}