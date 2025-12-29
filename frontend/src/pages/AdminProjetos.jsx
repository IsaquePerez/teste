import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Dropdown: 5 recentes ou filtrados
  const opcoesParaMostrar = searchTerm === '' 
    ? [...projetos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : projetos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  const filteredProjetos = projetos.filter(p => 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 40) => {
    return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
  };

  useEffect(() => { loadAll(); }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

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
        
        // Seleciona o primeiro módulo ativo se for novo
        const primeiroAtivo = modData.find(m => m.ativo !== false);
        if (primeiroAtivo && !form.modulo_id) {
            setForm(f => ({ ...f, modulo_id: primeiroAtivo.id }));
        }
        
    } catch (e) { 
        console.error(e); 
        toast.error("Erro ao carregar dados.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.modulo_id) return toast.warning("Selecione um Módulo.");

    // Valida duplicidade
    const nomeNormalizado = form.nome.trim().toLowerCase();
    const duplicado = projetos.some(p => 
        p.nome.trim().toLowerCase() === nomeNormalizado && 
        p.id !== editingId
    );
    if (duplicado) return toast.warning("Já existe um projeto com este nome.");

    if (editingId) {
        const projetoReal = projetos.find(p => p.id === editingId);
        if (projetoReal && projetoReal.status === 'finalizado') {
            return toast.info("Reative o projeto para editar.");
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
            toast.success("Projeto atualizado!");
        } else {
            await api.post("/projetos/", payload);
            toast.success("Projeto criado!");
        }
        
        handleCancel();
        loadAll(); 
    } catch (err) { 
        toast.error(err.message || "Erro ao salvar."); 
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

  const cycleStatus = async (projeto) => {
      const fluxo = { 'ativo': 'pausado', 'pausado': 'finalizado', 'finalizado': 'ativo' };
      const novoStatus = fluxo[projeto.status] || 'ativo';
      
      try {
          await api.put(`/projetos/${projeto.id}`, { ...projeto, status: novoStatus });
          toast.success(`Status: ${novoStatus.toUpperCase()}`);
          
          setProjetos(prev => prev.map(p => 
              p.id === projeto.id ? { ...p, status: novoStatus } : p
          ));
          if (editingId === projeto.id) setForm(prev => ({ ...prev, status: novoStatus }));

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
          toast.success("Projeto excluído.");
          loadAll();
          if (editingId === projectToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Não foi possível excluir.");
      } finally {
          setProjectToDelete(null);
      }
  };

  // Helpers de renderização
  const renderModuloBadge = (id) => {
      const mod = modulos.find(m => m.id === id);
      if (!mod) return <span style={{color: '#cbd5e1'}}>-</span>;
      return (
          <span className="badge" style={{
              backgroundColor: mod.ativo === false ? '#fee2e2' : '#eef2ff', 
              color: mod.ativo === false ? '#b91c1c' : '#3730a3',
              border: `1px solid ${mod.ativo === false ? 'rgba(185, 28, 28, 0.2)' : 'rgba(55, 48, 163, 0.2)'}`
          }}>
              {truncate(mod.nome, 25)} {mod.ativo === false ? '(Inativo)' : ''}
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
            {truncate(user.nome, 20)}
        </span>
      );
  };

  return (
    <main className="container grid">
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
                <select value={form.modulo_id} onChange={e => setForm({...form, modulo_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {modulos.map(m => (
                        <option key={m.id} value={m.id} style={{color: m.ativo === false ? '#991b1b' : 'inherit'}}>
                            {truncate(m.nome, 30)} {m.ativo === false ? '(Inativo)' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label>Responsável</label>
                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                    <option value="">Sem responsável</option>
                    {usuarios.filter(u => u.ativo !== false && u.nivel_acesso?.nome === 'admin').map(u => (
                        <option key={u.id} value={u.id}>{truncate(u.nome, 20)}</option>
                    ))}
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
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h2 className="section-title" style={{margin: 0}}>Projetos</h2>
            
            {/* Usa classe global agora */}
            <div ref={wrapperRef} className="search-wrapper" style={{width: '250px'}}>
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                        width: '100%',
                        padding: '8px 35px 8px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.9rem',
                        height: '38px',
                        boxSizing: 'border-box'
                    }}
                />
                <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}>🔍</span>

                {showSuggestions && opcoesParaMostrar.length > 0 && (
                    <ul className="custom-dropdown">
                        {opcoesParaMostrar.map(p => (
                            <li 
                                key={p.id} 
                                onClick={() => {
                                    setSearchTerm(p.nome);
                                    setShowSuggestions(false);
                                }}
                            >
                                <span>
                                    {truncate(p.nome, 25)}
                                    <span style={{fontSize:'0.75rem', color:'#9ca3af', marginLeft:'8px'}}>
                                        ({p.status})
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        <div className="table-wrap">
            {projetos.length === 0 ? <p className="muted" style={{textAlign:'center', padding:'20px'}}>Nenhum projeto encontrado.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th style={{textAlign: 'left'}}>Projeto</th>
                            <th style={{textAlign: 'left'}}>Módulo</th>
                            <th style={{textAlign: 'center'}}>Status</th>
                            <th style={{textAlign: 'left'}}>Responsável</th>
                            <th style={{textAlign: 'right'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProjetos.map(p => {
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
                                    <td style={{verticalAlign: 'middle'}}>
                                        <strong title={p.nome}>{truncate(p.nome, 40)}</strong>
                                        <div className="muted" style={{fontSize: '0.8rem'}} title={p.descricao}>
                                            {truncate(p.descricao, 40)}
                                        </div>
                                    </td>
                                    <td style={{verticalAlign: 'middle'}}>{renderModuloBadge(p.modulo_id)}</td>
                                    <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); cycleStatus(p); }}
                                            className="badge"
                                            style={{
                                                backgroundColor: style.bg, 
                                                color: style.color,
                                                minWidth: '80px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            {p.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{verticalAlign: 'middle'}}>{renderResponsavel(p.responsavel_id)}</td>
                                    <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
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
                        {filteredProjetos.length === 0 && (
                            <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhum projeto encontrado para "{searchTerm}"</td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </section>
    </main>
  );
}