import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useSnackbar } from '../../context/SnackbarContext'; 
import { Eye, EyeOff } from 'lucide-react';
import './styles.css';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  
  const { success, error, warning } = useSnackbar();
  
  // --- CONFIGURAÇÃO DA PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '', username: '', email: '', senha: '', ativo: true, nivel_acesso_id: 2 
  });

  // --- FILTROS GLOBAIS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const globalSearchRef = useRef(null);

  // --- FILTRO: ROLE (NÍVEL DE ACESSO) ---
  const [roleSearchText, setRoleSearchText] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(''); 
  const [isRoleSearchOpen, setIsRoleSearchOpen] = useState(false);
  const roleHeaderRef = useRef(null);

  // --- FILTRO: STATUS ---
  const [statusSearchText, setStatusSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); 
  const [isStatusSearchOpen, setIsStatusSearchOpen] = useState(false);
  const statusHeaderRef = useRef(null);

  // --- BOTÃO DE MOSTRAR SENHA
  const [showPassword, setShowPassword] = useState(false);

  // --- HELPERS DE TEXTO ---
  const truncate = (str, n = 25) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  const formatEmail = (email) => {
      if (!email) return '-';
      const parts = email.split('@');
      if (parts.length < 2) return truncate(email, 20);
      return `${truncate(parts[0], 15)}@${parts[1]}`;
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRoleId, selectedStatus]);

  // Click Outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (roleHeaderRef.current && !roleHeaderRef.current.contains(event.target)) {
        if (!selectedRoleId) { setIsRoleSearchOpen(false); setRoleSearchText(''); }
      }
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedRoleId, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/usuarios/");
      const data = response.data || response; 
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRAGEM AVANÇADA (CORRIGIDA) ---

  // 1. Primeiro, aplicamos APENAS os filtros de coluna (Role e Status)
  const baseFilteredUsers = users.filter(u => {
    // Filtro Role
    if (selectedRoleId && u.nivel_acesso_id !== parseInt(selectedRoleId)) return false;
    
    // Filtro Status
    if (selectedStatus !== '') {
        const statusBool = selectedStatus === 'true';
        if (u.ativo !== statusBool) return false;
    }
    return true;
  });

  // 2. Depois, aplicamos a busca global SOBRE o resultado dos filtros de coluna
  const filteredUsers = baseFilteredUsers.filter(u => {
    const term = searchTerm.toLowerCase();
    if (!term) return true; // Se não tem busca, retorna tudo que passou nos filtros

    return (
        u.nome.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) || 
        (u.username || '').toLowerCase().includes(term)
    );
  });

  // 3. Sugestões do Search Global:
  // Agora elas respeitam os filtros ativos! 
  // Se searchTerm vazio, sugere os top 5 da base filtrada.
  // Se tem searchTerm, sugere os top 5 do resultado final.
  const globalSuggestions = searchTerm === '' 
    ? baseFilteredUsers.slice(0, 5) 
    : filteredUsers.slice(0, 5);

  // ---------------------------------------------------

  const roleOptions = [{id: 1, label: 'Admin'}, {id: 2, label: 'User/QA'}];
  const filteredRolesHeader = roleOptions.filter(r => r.label.toLowerCase().includes(roleSearchText.toLowerCase()));

  const statusOptions = [{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}];
  const filteredStatusHeader = statusOptions.filter(s => s.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  // --- ACTIONS ---
  const handleReset = () => {
    setForm({ nome: '', username: '', email: '', senha: '', ativo: true, nivel_acesso_id: 2 });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome, username: item.username || '', email: item.email,
      senha: '', ativo: item.ativo, nivel_acesso_id: item.nivel_acesso_id || 2
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.email.trim()) return warning("Nome e Email são obrigatórios.");
    
    if (!editingId && !form.senha) return warning("Senha é obrigatória para novos usuários.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      error("Por favor, inclua um '@' e um domínio válido no endereço de e-mail.");
      return;
    }
    
    if (form.username && form.username.trim() !== '') {
        const usernameExists = users.some(u => 
            u.username?.toLowerCase() === form.username.trim().toLowerCase() && u.id !== editingId 
        );
        if (usernameExists) return warning(`O username "${form.username}" já está em uso.`);
    }
    const emailExists = users.some(u => 
        u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingId 
    );
    if (emailExists) return warning(`O email "${form.email}" já está cadastrado.`);

    try {
      const payload = { ...form };
      if (editingId && !payload.senha) delete payload.senha; 
      if (!payload.username) delete payload.username; 

      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        success("Usuário atualizado!");
      } else {
        await api.post("/usuarios/", payload);
        success("Usuário criado!");
      }
      handleReset();
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar usuário.";
      error(typeof msg === 'string' ? msg : "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try { await api.delete(`/usuarios/${itemToDelete.id}`); success("Usuário removido."); loadData(); } 
    catch (e) { error("Erro ao excluir."); } 
    finally { setIsDeleteModalOpen(false); setItemToDelete(null); }
  };

  const getPaginationGroup = () => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const isFormInvalid =  !form.nome.trim() || !form.username.trim() || !form.email.trim() || (!editingId && !form.senha);

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete}
        title="Remover Usuário?" message={`Deseja remover "${itemToDelete?.nome}"?`} isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header"><h3 className="form-title">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3></div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  
                  <div className="form-grid">
                    <div style={{gridColumn: '1 / -1'}}>
                        <label className="input-label"><b>Nome Completo</b></label>
                        <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control" />
                    </div>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
                    <div>
                      <label className="input-label"><b>Username</b></label>
                      <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="form-control"/>
                    </div>
                    <div className="toggle-wrapper" style={{gridColumn: '3', marginTop: '28px'}}>
                        <label className="switch">
                            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.checked})}/>
                            <span className="slider"></span>
                        </label>
                        <span className="toggle-label">{form.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div style={{gridColumn: '1 / -1'}}>
                      <label className="input-label"><b>Email</b></label>
                      <input type="text" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="form-control" />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div style={{ position: 'relative' }}>
                        <label className="input-label"><b>{editingId ? 'Nova Senha (opcional)' : 'Senha'}</b></label>
                        <div>
                          <input type={showPassword ? "text" : "password"} value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="form-control" />
                          <button
                            type="button"
                            className="eyeButton"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex="-1"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                    </div>
                    <div>
                        <label className="input-label"><b>Nível de Acesso</b></label>
                        <select value={form.nivel_acesso_id} onChange={e => setForm({...form, nivel_acesso_id: parseInt(e.target.value)})} className="form-control bg-gray">
                        <option value={1}>Admin</option>
                        <option value={2}>User / QA</option>
                        </select>
                    </div>
                  </div>
              </div>
              <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button 
                      type="submit" 
                      className="btn primary" 
                      disabled={isFormInvalid} 
                      title={isFormInvalid ? "Preencha todos os campos" : ""}
                  >
                      Salvar
                  </button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           <div className="toolbar">
               <h3 className="page-title">Usuários</h3>
               <div className="toolbar-actions">
                  <button onClick={() => setView('form')} className="btn primary btn-new">Novo Usuário</button>
                  <div className="separator"></div>
                   <div className="search-wrapper" ref={globalSearchRef}>
                        <input type="text" placeholder="Buscar usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                        <span className="search-icon">🔍</span>
                        {showSuggestions && (
                            <ul className="custom-dropdown">
                                {globalSuggestions.length === 0 ? (
                                    <li style={{color:'#999'}}>
                                        {searchTerm ? 'Nenhum usuário encontrado.' : 'Nenhum usuário com esses filtros.'}
                                    </li>
                                ) : (
                                    globalSuggestions.map((u) => (
                                        <li key={u.id} onClick={() => { setSearchTerm(u.nome || u.username); setShowSuggestions(false); }}>
                                            <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                                                <span>{truncate(u.nome, 20)}</span>
                                                <span style={{fontSize:'0.75rem', color:'#9ca3af', fontStyle:'italic'}}>{u.nivel_acesso_id === 1 ? 'Admin' : 'User'}</span>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                   </div>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <div className="content-area">
                   <table>
                       <thead>
                         <tr>
                           <th style={{width: '60px'}}>ID</th>
                           <th>Nome / Username</th>
                           <th>Email</th>
                           <th style={{width: '120px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={roleHeaderRef}>
                                    {isRoleSearchOpen || selectedRoleId ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedRoleId ? 'active' : ''}`} placeholder="Role..."
                                                value={selectedRoleId && roleSearchText === '' ? (selectedRoleId === '1' ? 'Admin' : 'User/QA') : roleSearchText}
                                                onChange={(e) => { setRoleSearchText(e.target.value); if(selectedRoleId) setSelectedRoleId(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                e.stopPropagation(); if(selectedRoleId){setSelectedRoleId('');setRoleSearchText('')}else{setIsRoleSearchOpen(false);setRoleSearchText('')}
                                            }}>✕</button>
                                            {(!selectedRoleId || roleSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}>
                                                    <li onClick={() => { setSelectedRoleId(''); setRoleSearchText(''); setIsRoleSearchOpen(false); }}><span style={{color:'#3b82f6', fontWeight:'bold'}}>Todos</span></li>
                                                    {filteredRolesHeader.map(r => (
                                                        <li key={r.id} onClick={() => { setSelectedRoleId(String(r.id)); setRoleSearchText(''); setIsRoleSearchOpen(true); }}>{r.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsRoleSearchOpen(true)} title="Filtrar Role">ROLE <span className="filter-icon">▼</span></div>
                                    )}
                                </div>
                           </th>
                           <th style={{textAlign: 'center', width: '140px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                    {isStatusSearchOpen || selectedStatus ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`} placeholder="Status..."
                                                value={selectedStatus && statusSearchText === '' ? (selectedStatus === 'true' ? 'Ativo' : 'Inativo') : statusSearchText}
                                                onChange={(e) => { setStatusSearchText(e.target.value); if(selectedStatus) setSelectedStatus(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                e.stopPropagation(); if(selectedStatus){setSelectedStatus('');setStatusSearchText('')}else{setIsStatusSearchOpen(false);setStatusSearchText('')}
                                            }}>✕</button>
                                            {(!selectedStatus || statusSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0, textAlign: 'left'}}>
                                                    <li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusSearchOpen(false); }}><span style={{color:'#3b82f6', fontWeight:'bold'}}>Todos</span></li>
                                                    {filteredStatusHeader.map(s => (
                                                        <li key={s.value} onClick={() => { setSelectedStatus(s.value); setStatusSearchText(''); setIsStatusSearchOpen(true); }}>{s.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsStatusSearchOpen(true)} title="Filtrar Status">STATUS <span className="filter-icon">▼</span></div>
                                    )}
                                </div>
                           </th>
                           <th style={{textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredUsers.length === 0 ? (
                            <tr><td colSpan="6" className="no-results" style={{textAlign: 'center', padding: '20px'}}>Nenhum usuário encontrado.</td></tr>
                         ) : (
                           currentUsers.map(item => (
                            <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                                <td className="cell-id">#{item.id}</td>
                                <td>
                                    <div className="cell-name">{truncate(item.nome, 20)}</div>
                                    {item.username && <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>#{truncate(item.username, 20)}</div>}
                                </td>
                                <td style={{color:'#64748b'}}>{formatEmail(item.email)}</td>
                                <td>
                                    <span className={`badge system`} style={{backgroundColor: item.nivel_acesso_id === 1 ? '#e0f2fe' : '#f1f5f9', color: item.nivel_acesso_id === 1 ? '#0369a1' : '#475569'}}>
                                        {item.nivel_acesso_id === 1 ? 'ADMIN' : 'USER'}
                                    </span>
                                </td>
                                <td className="cell-status" style={{textAlign: 'center'}}>
                                    <span className={`status-badge ${item.ativo ? 'ativo' : 'inativo'}`} style={{backgroundColor: item.ativo ? '#001C42' : '#64748b', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem'}}>
                                        {item.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="cell-actions">
                                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} className="btn danger small btn-action-icon">🗑️</button>
                                </td>
                            </tr>
                           ))
                         )}
                       </tbody>
                     </table>
               </div>
               {filteredUsers.length > 0 && (
                   <div className="pagination-container">
                      <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>
                      {getPaginationGroup().map((item) => (
                        <button key={item} onClick={() => paginate(item)} className={`pagination-btn ${currentPage === item ? 'active' : ''}`}>{item}</button>
                      ))}
                      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button>
                   </div>
               )}
             </div>
           )}
        </section>
      )}
    </main>
  );
}