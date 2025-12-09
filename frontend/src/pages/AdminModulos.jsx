import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

/* ==========================================================================
   COMPONENTE: ADMIN MÓDULOS
   Gerenciamento dos módulos funcionais vinculados a um sistema.
   ========================================================================== */
export function AdminModulos() {
  const [modulos, setModulos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '' });
  const [editingId, setEditingId] = useState(null);

  // Estados do Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moduloToDelete, setModuloToDelete] = useState(null);

  /* ==========================================================================
     CARREGAMENTO INICIAL
     ========================================================================== */
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
        if (ativos.length > 0 && !form.sistema_id) {
            setForm(f => ({ ...f, sistema_id: ativos[0].id }));
        }
    } catch (e) { 
        console.error(e); 
        toast.error("Erro ao carregar dados.");
    }
  };

  /* ==========================================================================
     AÇÕES DE FORMULÁRIO (SALVAR)
     ========================================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDAÇÃO MANUAL: Verifica se o sistema foi selecionado
    // Se não tiver sistema_id, mostra o Toast Amarelo e para a função.
    if (!form.sistema_id) {
        return toast.warning("Selecione um Sistema Pai.");
    }

    try {
      const payload = { ...form, sistema_id: parseInt(form.sistema_id) };
      
      if (editingId) {
          await api.put(`/modulos/${editingId}`, payload);
          toast.success("Módulo atualizado com sucesso!");
      } else {
          await api.post("/modulos/", { ...payload, ativo: true });
          toast.success("Módulo criado com sucesso!");
      }
      
      handleCancel();
      const updatedMods = await api.get("/modulos/");
      setModulos(updatedMods);

    } catch (error) { 
        toast.error(error.message || "Erro ao salvar módulo."); 
    }
  };

  const handleCancel = () => {
      setEditingId(null);
      setForm(f => ({...f, nome:'', descricao:''})); 
  };

  const handleSelectRow = (modulo) => {
      setForm({
          nome: modulo.nome, 
          descricao: modulo.descricao, 
          sistema_id: modulo.sistema_id
      });
      setEditingId(modulo.id);
  };

  /* ==========================================================================
     AÇÕES DE STATUS E EXCLUSÃO
     ========================================================================== */
  const toggleActive = async (modulo) => {
      try {
          await api.put(`/modulos/${modulo.id}`, { ativo: !modulo.ativo });
          toast.success(`Módulo ${!modulo.ativo ? 'ativado' : 'desativado'}.`);
          setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ativo: !m.ativo } : m));
      } catch(e) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  const requestDelete = (modulo) => {
      setModuloToDelete(modulo);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!moduloToDelete) return;
      try {
          await api.delete(`/modulos/${moduloToDelete.id}`);
          toast.success("Módulo excluído.");
          setModulos(prev => prev.filter(m => m.id !== moduloToDelete.id));
          if (editingId === moduloToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Não foi possível excluir.");
      } finally {
          setModuloToDelete(null);
      }
  };

  const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || 'Sistema Removido';
  const sistemasAtivos = sistemas.filter(s => s.ativo);

  /* ==========================================================================
     RENDERIZAÇÃO
     ========================================================================== */
  return (
    <main className="container grid">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Módulo?"
        message={`Tem a certeza que deseja excluir o módulo "${moduloToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
                <label>Sistema Pai</label>
                {/* REMOVIDO O ATRIBUTO 'required' DAQUI PARA FUNCIONAR O TOAST */}
                <select 
                    value={form.sistema_id} 
                    onChange={e => setForm({...form, sistema_id: e.target.value})} 
                >
                    <option value="">Selecione um sistema...</option>
                    {sistemasAtivos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            </div>
            <div>
                <label>Nome do Módulo</label>
                <input 
                    required 
                    value={form.nome} 
                    onChange={e => setForm({...form, nome: e.target.value})} 
                    placeholder="Ex: Contas a Pagar" 
                />
            </div>
            <div>
                <label>Descrição</label>
                <input 
                    value={form.descricao} 
                    onChange={e => setForm({...form, descricao: e.target.value})} 
                    placeholder="Descrição funcional..."
                />
            </div>
          </div>
          
          <div className="actions" style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn primary">
                {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            {editingId && (
                <button type="button" onClick={handleCancel} className="btn">
                    Cancelar
                </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Módulos Cadastrados</h2>
        <div className="table-wrap">
            {modulos.length === 0 ? <p className="muted" style={{textAlign:'center', padding:'20px'}}>Nenhum módulo cadastrado.</p> : (
                <table>
                    <thead><tr><th>Módulo</th><th>Sistema</th><th style={{textAlign:'right'}}>Ações</th></tr></thead>
                    <tbody>
                        {modulos.map(m => (
                            <tr 
                                key={m.id} 
                                onClick={() => handleSelectRow(m)}
                                className={editingId === m.id ? 'selected' : 'selectable'}
                                style={{opacity: m.ativo ? 1 : 0.6}}
                            >
                                <td>
                                    <strong>{m.nome}</strong>
                                    <div className="muted" style={{fontSize: '0.8rem'}}>{m.descricao}</div>
                                </td>
                                <td>
                                    <span className="badge" style={{backgroundColor: '#e0f2fe', color: '#0369a1'}}>
                                        {getSistemaName(m.sistema_id)}
                                    </span>
                                </td>
                                <td style={{textAlign: 'right', whiteSpace: 'nowrap'}}>
                                    <span 
                                        onClick={(e) => { e.stopPropagation(); toggleActive(m); }}
                                        className={`badge ${m.ativo ? 'on' : 'off'}`}
                                        title="Clique para alternar"
                                        style={{cursor: 'pointer', marginRight: '10px'}}
                                    >
                                        {m.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); requestDelete(m); }}
                                        className="btn danger small"
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </section>
    </main>
  );
}