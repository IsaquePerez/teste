import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  
  // CONFIGURAÇÃO DA PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    username: '', 
    email: '',
    senha: '',
    ativo: true,
    nivel_acesso_id: 2 
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Carrega dados ao abrir a tela
  useEffect(() => { loadData(); }, []);

  // Reseta para a página 1 sempre que o usuário pesquisar algo novo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/usuarios/");
      const data = response.data || response; 
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar usuários.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ nome: '', username: '', email: '', senha: '', ativo: true, nivel_acesso_id: 2 });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      username: item.username || '', 
      email: item.email,
      senha: '', 
      ativo: item.ativo,
      nivel_acesso_id: item.nivel_acesso_id || 2
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleToggleStatus = () => {
    // Busca o usuário logado no localStorage
    const storedUser = localStorage.getItem('user');
    const loggedUser = storedUser ? JSON.parse(storedUser) : {};

    // Se o usuário estiver tentando INATIVAR (form.ativo === true)
    // E o ID sendo editado for o mesmo do usuário logado
    if (editingId === loggedUser.id && form.ativo === true) {
        return toast.error("Você não pode inativar seu próprio usuário!");
    }

    // Se passou na validação, inverte o status
    setForm({ ...form, ativo: !form.ativo });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!form.nome.trim() || !form.email.trim()) return toast.warning("Nome e Email são obrigatórios.");
    if (!editingId && !form.senha) return toast.warning("Senha é obrigatória para novos usuários.");

    // Verifica duplicidade de Username
    if (form.username && form.username.trim() !== '') {
        const usernameExists = users.some(u => 
            u.username?.toLowerCase() === form.username.trim().toLowerCase() && 
            u.id !== editingId 
        );
        if (usernameExists) return toast.warning(`O username "${form.username}" já está em uso.`);
    }

    // Verifica duplicidade de Email
    const emailExists = users.some(u => 
        u.email.toLowerCase() === form.email.trim().toLowerCase() && 
        u.id !== editingId 
    );
    if (emailExists) return toast.warning(`O email "${form.email}" já está cadastrado.`);

    try {
      const payload = { ...form };
      if (editingId && !payload.senha) delete payload.senha; 
      if (!payload.username) delete payload.username; 

      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        toast.success("Usuário atualizado!");
      } else {
        await api.post("/usuarios/", payload);
        toast.success("Usuário criado!");
      }
      handleReset();
      loadData();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Erro ao salvar usuário.";
      toast.error(typeof msg === 'string' ? msg : "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/usuarios/${itemToDelete.id}`);
      toast.success("Usuário removido.");
      loadData();
    } catch (e) {
      toast.error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchName = (u.nome || '').toLowerCase().includes(term);
    const matchEmail = (u.email || '').toLowerCase().includes(term);
    const matchUsername = (u.username || '').toLowerCase().includes(term);
    return matchName || matchEmail || matchUsername;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
  }

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPaginationGroup = () => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Remover Usuário?"
        message={`Deseja remover "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className="form-grid">
                    <div>
                        <label className="input-label">Nome Completo <span className="required-asterisk">*</span></label>
                        <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control" />
                    </div>
                    <div>
                        <label className="input-label">Username</label>
                        <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="form-control" placeholder="Ex: joao.qa" />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Email <span className="required-asterisk">*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="form-control" />
                  </div>

                  <div className="form-grid">
                    <div>
                        <label className="input-label">{editingId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                        <input type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="form-control" />
                    </div>
                    <div>
                        <label className="input-label">Nível de Acesso</label>
                        <select value={form.nivel_acesso_id} onChange={e => setForm({...form, nivel_acesso_id: parseInt(e.target.value)})} className="form-control bg-gray">
                        <option value={1}>Admin</option>
                        <option value={2}>User / QA</option>
                        </select>
                    </div>
                  </div>
              </div>

              <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={handleToggleStatus} 
                    className={`btn ${form.ativo ? 'danger' : 'success'}`}
                    style={{ marginRight: 'auto' }}
                  >
                    {form.ativo ? 'Inativar Usuário' : 'Ativar Usuário'}
                  </button>

                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">Salvar</button>
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
                   <div className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                   </div>
                   <button onClick={() => setView('form')} className="btn primary btn-new">Novo Usuário</button>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">

               <div className="content-area">
                   {filteredUsers.length === 0 ? (
                     <div className="empty-container">Nenhum usuário encontrado para "{searchTerm}"</div>
                   ) : (
                     <table>
                       <thead>
                         <tr>
                           <th style={{width: '60px'}}>ID</th>
                           <th>Nome / Username</th>
                           <th>Email</th>
                           <th>Role</th>
                           <th style={{textAlign: 'center'}}>Status</th>
                           <th style={{textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         {currentUsers.map(item => (
                           <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                               <td className="cell-id">#{item.id}</td>
                               <td>
                                   <div className="cell-name">{item.nome}</div>
                                   {item.username && (
                                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>#{item.username}</div>
                                   )}
                               </td>
                               <td style={{color:'#64748b'}}>{item.email}</td>
                               <td>
                                   <span className="roles">
                                       {item.nivel_acesso_id === 1 ? 'ADMIN' : 'USER'}
                                   </span>
                               </td>
                               <td className="cell-status">
                                   <span 
                                      style={{
                                          backgroundColor: item.ativo ? '#001C42' : '#0F2B66', 
                                          color: '#ffffff'
                                      }} 
                                      className="status-badge"
                                   >
                                       {item.ativo ? 'Ativo' : 'Inativo'}
                                   </span>
                               </td>
                               <td className="cell-actions">
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} 
                                       className="btn danger small btn-action-icon"
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

               <div className="pagination-container">
                  <button onClick={() => paginate(1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Primeira">«</button>
                  <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Anterior">‹</button>

                  {getPaginationGroup().map((item) => (
                    <button
                      key={item}
                      onClick={() => paginate(item)}
                      className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                    >
                      {item}
                    </button>
                  ))}

                  {totalPages === 0 && (
                      <button className="pagination-btn active" disabled>1</button>
                  )}

                  <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Próxima">›</button>
                  <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Última">»</button>
               </div>
               
             </div>
           )}
        </section>
      )}
    </main>
  );
}