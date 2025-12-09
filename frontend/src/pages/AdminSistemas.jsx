import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
// Certifique-se de que o caminho do import abaixo está correto
import { ConfirmationModal } from '../components/ConfirmationModal'; 

/* ==========================================================================
   COMPONENTE: ADMIN SISTEMAS
   ========================================================================== */
export function AdminSistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [editingId, setEditingId] = useState(null);

  // --- ESTADOS DO MODAL DE EXCLUSÃO ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sistemaToDelete, setSistemaToDelete] = useState(null);

  const LIMITS = { nome: 50, descricao: 100 };

  // Carregamento Inicial
  useEffect(() => { loadSistemas(); }, []);

  const loadSistemas = async () => {
    setLoading(true);
    try {
      const data = await api.get("/sistemas/");
      setSistemas(Array.isArray(data) ? data : []);
    } catch (error) { 
      console.error(error); 
      toast.error("Erro ao carregar sistemas."); 
    } finally { 
      setLoading(false); 
    }
  };

  // Salvar (Criar ou Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/sistemas/${editingId}`, form);
        toast.success("Sistema atualizado!");
      } else {
        await api.post("/sistemas/", { ...form, ativo: true });
        toast.success("Sistema criado!");
      }
      handleCancel();
      loadSistemas(); 
    } catch (error) { 
      toast.error(error.message || "Erro ao salvar."); 
    }
  };

  const handleCancel = () => {
      setForm({ nome: '', descricao: '' });
      setEditingId(null);
  };

  const handleSelectRow = (s) => {
    setForm({ nome: s.nome, descricao: s.descricao });
    setEditingId(s.id);
  };

  const toggleActive = async (sistema) => {
      try {
          const novoStatus = !sistema.ativo;
          await api.put(`/sistemas/${sistema.id}`, { ativo: novoStatus });
          toast.success(`Sistema ${novoStatus ? 'ativado' : 'desativado'}.`);
          loadSistemas();
      } catch(e) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  // --- LÓGICA DO MODAL (PASSO 1): Pedir para excluir ---
  // Esta função abre a janela bonita em vez do alert feio
  const requestDelete = (sistema) => {
      setSistemaToDelete(sistema);
      setIsDeleteModalOpen(true);
  };

  // --- LÓGICA DO MODAL (PASSO 2): Confirmar exclusão ---
  // Esta função é chamada quando o usuário clica em "Sim, Excluir" no Modal
  const confirmDelete = async () => {
      if (!sistemaToDelete) return;
      
      try {
          await api.delete(`/sistemas/${sistemaToDelete.id}`);
          toast.success(`Sistema excluído com sucesso.`);
          loadSistemas();
          if (editingId === sistemaToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Erro ao excluir (verifique vínculos).");
      } finally {
          setSistemaToDelete(null); 
      }
  };

  return (
    <main className="container grid">
      
      {/* O componente Modal fica aqui, invisível até ser chamado */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Sistema?"
        message={`Tem a certeza que deseja excluir "${sistemaToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {/* Formulário */}
      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar' : 'Novo Sistema'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
                <label>Nome</label>
                <input required maxLength={LIMITS.nome} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            </div>
            <div>
                <label>Descrição</label>
                <input maxLength={LIMITS.descricao} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            </div>
          </div>
          <div className="actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Salvar' : 'Criar'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="btn">Cancelar</button>}
          </div>
        </form>
      </section>

      {/* Tabela */}
      <section className="card">
        <h2 className="section-title">Sistemas</h2>
        <div className="table-wrap">
            {loading ? <p>Carregando...</p> : (
                <table>
                    <thead><tr><th>Nome</th><th style={{textAlign: 'right'}}>Ações</th></tr></thead>
                    <tbody>
                        {sistemas.map(s => (
                            <tr key={s.id} onClick={() => handleSelectRow(s)} className={editingId === s.id ? 'selected' : 'selectable'} style={{opacity: s.ativo ? 1 : 0.6}}>
                                <td>
                                    <strong>{s.nome}</strong>
                                    <div className="muted" style={{fontSize:'0.8rem'}}>{s.descricao}</div>
                                </td>
                                <td style={{textAlign: 'right', whiteSpace: 'nowrap'}}>
                                    <span onClick={(e) => { e.stopPropagation(); toggleActive(s); }} className={`badge ${s.ativo ? 'on' : 'off'}`} style={{marginRight:'10px', cursor:'pointer'}}>
                                        {s.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                    
                                    {/* O BOTÃO CORRIGIDO ESTÁ ABAIXO */}
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            requestDelete(s); // <--- Chamada Correta
                                        }}
                                        className="btn danger small"
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