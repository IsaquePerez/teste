import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

/* ==========================================================================
   COMPONENTE: ADMIN PROJETOS
   Gerenciamento de projetos de teste (vinculados a módulos).
   ========================================================================== */
export function AdminProjetos() {
  /* ==========================================================================
     ESTADOS
     ========================================================================== */
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  /* ==========================================================================
     CARREGAMENTO DE DADOS
     ========================================================================== */
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
        setModulos(modData); 
        setUsuarios(userData);
        
        const primeiroAtivo = modData.find(m => m.ativo !== false);
        if (primeiroAtivo && !form.modulo_id) {
            setForm(f => ({ ...f, modulo_id: primeiroAtivo.id }));
        }
        
    } catch (e) { 
        console.error(e); 
        toast.error("Erro ao carregar dados do projeto.");
    }
  };

  /* ==========================================================================
     PERSISTÊNCIA DE DADOS (CRIAR / ATUALIZAR)
     ========================================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.modulo_id) {
        return toast.warning("Por favor, selecione um Módulo.");
    }

    /* Validação de Integridade:
       Impede a edição se o status atual na lista for 'finalizado', 
       prevenindo inconsistência de estado entre formulário e banco.
    */
    if (editingId) {
        const projetoReal = projetos.find(p => p.id === editingId);
        if (projetoReal && projetoReal.status === 'finalizado') {
            return toast.info("Projeto finalizado. Reative-o na tabela para permitir edições.");
        }
    }

    const payload = {
        ...form,
        modulo_id: parseInt(form.modulo_id),
        sistema_id: modulos.find(m => m.id == form.modulo_id)?.sistema_id,
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null
    };

    try {
        if (editingId) {
            await api.put(`/projetos/${editingId}`, payload);
            toast.success("Projeto atualizado com sucesso!");
        } else {
            await api.post("/projetos/", payload);
            toast.success("Projeto criado com sucesso!");
        }
        
        handleCancel();
        loadAll(); 
    } catch (err) { 
        toast.error(err.message || "Erro ao salvar projeto."); 
    }
  };

  const handleCancel = () => {
      setEditingId(null);
      setForm(f => ({ ...f, nome: '', descricao: '', status: 'ativo' }));
  };

  const handleSelectRow = (projeto) => {
      if (projeto.status === 'finalizado') {
          return toast.info("Reative o projeto clicando no status para editá-lo.");
      }

      setForm({
          nome: projeto.nome,
          descricao: projeto.descricao || '',
          modulo_id: projeto.modulo_id,
          responsavel_id: projeto.responsavel_id || '',
          status: projeto.status
      });
      setEditingId(projeto.id);
  };

  /* ==========================================================================
     GESTÃO DE STATUS E EXCLUSÃO
     ========================================================================== */
  const cycleStatus = async (projeto) => {
      const fluxo = { 'ativo': 'pausado', 'pausado': 'finalizado', 'finalizado': 'ativo' };
      const novoStatus = fluxo[projeto.status] || 'ativo';
      
      try {
          await api.put(`/projetos/${projeto.id}`, { ...projeto, status: novoStatus });
          toast.success(`Status alterado para: ${novoStatus.toUpperCase()}`);
          
          setProjetos(prev => prev.map(p => 
              p.id === projeto.id ? { ...p, status: novoStatus } : p
          ));
          
          if (editingId === projeto.id) {
              setForm(prev => ({ ...prev, status: novoStatus }));
          }

      } catch(e) { 
          toast.error("Erro ao mudar status."); 
      }
  };

  const requestDelete = (projeto) => {
      setProjectToDelete(projeto);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!projectToDelete) return;

      try {
          await api.delete(`/projetos/${projectToDelete.id}`);
          toast.success("Projeto e dados vinculados excluídos.");
          loadAll();
          if (editingId === projectToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Não foi possível excluir o projeto.");
      } finally {
          setProjectToDelete(null);
      }
  };

  /* ==========================================================================
     HELPERS DE RENDERIZAÇÃO
     ========================================================================== */
  const renderModuloBadge = (id) => {
      const mod = modulos.find(m => m.id === id);
      if (!mod) return <span style={{color: '#cbd5e1'}}>-</span>;

      if (mod.ativo === false) {
          return (
              <span className="badge" style={{
                  backgroundColor: '#fee2e2', color: '#b91c1c',
                  border: '1px solid rgba(185, 28, 28, 0.2)'
              }}>
                  {mod.nome} (Inativo)
              </span>
          );
      }
      return (
          <span className="badge" style={{
              backgroundColor: '#eef2ff', color: '#3730a3',
              border: '1px solid rgba(55, 48, 163, 0.2)'
          }}>
              {mod.nome}
          </span>
      );
  };
  
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
      
      return (
        <span className="badge" style={{
            backgroundColor: user.ativo ? '#f3f4f6' : '#fee2e2', 
            color: user.ativo ? '#374151' : '#b91c1c'
        }}>
            {user.nome} {user.ativo ? '' : '(Inativo)'}
        </span>
      );
  };

  /* ==========================================================================
     INTERFACE (JSX)
     ========================================================================== */
  return (
    <main className="container grid">
      <style>{`
        .status-hover { transition: all 0.2s ease-in-out; }
        .status-hover:hover { filter: brightness(0.95); transform: scale(1.05); cursor: pointer; }
      `}</style>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Projeto?"
        message={`ATENÇÃO: Apagar o projeto "${projectToDelete?.nome}" excluirá TODOS os ciclos, casos de teste e execuções vinculados a ele.`}
        confirmText="Sim, Excluir Tudo"
        isDanger={true}
      />

      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
                <label>Módulo Pai</label>
                <select 
                    value={form.modulo_id} 
                    onChange={e => setForm({...form, modulo_id: e.target.value})}
                >
                    <option value="">Selecione...</option>
                    {modulos.map(m => (
                        <option 
                            key={m.id} 
                            value={m.id}
                            style={{color: m.ativo === false ? '#991b1b' : 'inherit'}}
                        >
                            {m.nome} {m.ativo === false ? '(Inativo)' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label>Responsável</label>
                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                    <option value="">Sem responsável</option>
                    {usuarios.map(u => (u.ativo !== false ? <option key={u.id} value={u.id}>{u.nome}</option> : null))}
                </select>
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Nome do Projeto</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Refatoração do Login" />
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={3} />
            </div>
          </div>
          <div className="actions" style={{marginTop:'15px', display:'flex', gap:'10px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Atualizar' : 'Cadastrar'}</button>
            {editingId && <button type="button" className="btn" onClick={handleCancel}>Cancelar Seleção</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Lista de Projetos</h2>
        <div className="table-wrap">
            {projetos.length === 0 ? <p className="muted" style={{textAlign:'center', padding:'20px'}}>Nenhum projeto encontrado.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th>Projeto</th>
                            <th>Módulo</th>
                            <th>Status</th>
                            <th>Responsável</th>
                            <th style={{textAlign: 'right'}}>Ações</th>
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
                                    style={{ 
                                        opacity: isFinalizado ? 0.6 : 1, 
                                        backgroundColor: isFinalizado ? '#f9fafb' : 'transparent'
                                    }}
                                >
                                    <td><strong>{p.nome}</strong></td>
                                    <td>{renderModuloBadge(p.modulo_id)}</td>
                                    <td>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); cycleStatus(p); }}
                                            className="badge status-hover"
                                            style={{
                                                backgroundColor: style.bg, 
                                                color: style.color,
                                                minWidth: '80px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {p.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{renderResponsavel(p.responsavel_id)}</td>
                                    <td style={{textAlign: 'right'}}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); requestDelete(p); }}
                                            className="btn danger small"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
      </section>
    </main>
  );
}