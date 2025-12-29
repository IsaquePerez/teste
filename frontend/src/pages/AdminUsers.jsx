import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null); 
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    senha: '',
    nivel_acesso_id: 2 
  });

  // Filtra dropdown 
  const opcoesParaMostrar = searchTerm === '' 
    ? [...users].sort((a, b) => b.id - a.id).slice(0, 5) 
    : users.filter(u => 
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8);

  // Filtra tabela
  const filteredUsers = users.filter(u => 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 40) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  useEffect(() => { loadUsers(); }, []);

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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get("/usuarios/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar lista.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    setSelectedUser(user);
    setForm({
      nome: user.nome || '',
      username: user.username || '', 
      email: user.email || '',
      senha: '', 
      nivel_acesso_id: user.nivel_acesso_id || 2
    });
  };

  const handleClear = () => {
    setSelectedUser(null);
    setForm({ nome: '', username: '', email: '', senha: '', nivel_acesso_id: 2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nome.trim()) return toast.warning("Nome obrigatório.");
    if (!form.username.trim()) return toast.warning("Username obrigatório.");
    if (!form.email.trim()) return toast.warning("Email obrigatório.");
    
    if (!selectedUser && !form.senha) {
        return toast.warning("Senha obrigatória.");
    }

    try {
      if (selectedUser) {
        const payload = {
          nome: form.nome,
          username: form.username,
          email: form.email,
          nivel_acesso_id: parseInt(form.nivel_acesso_id)
        };
        if (form.senha) payload.senha = form.senha;

        await api.put(`/usuarios/${selectedUser.id}`, payload);
        toast.success("Usuário atualizado.");
      } else {
        const payload = {
          nome: form.nome,
          username: form.username,
          email: form.email,
          senha: form.senha,
          nivel_acesso_id: parseInt(form.nivel_acesso_id),
          ativo: true
        };
        await api.post("/usuarios/", payload);
        toast.success("Usuário criado.");
      }
      
      handleClear();
      loadUsers(); 
    } catch (error) {
      toast.error(error.message || "Erro ao salvar.");
    }
  };

  const toggleActive = async (user) => {
      try {
          const novoStatus = !user.ativo;
          await api.put(`/usuarios/${user.id}`, { ativo: novoStatus });
          toast.success(`Status alterado.`);
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ativo: novoStatus } : u));
          if (selectedUser?.id === user.id) {
              setSelectedUser(prev => ({ ...prev, ativo: novoStatus }));
          }
      } catch (error) { 
        toast.error("Erro ao alterar status."); 
      }
  };

  const requestDelete = () => {
      if (!selectedUser) return;
      if (selectedUser.nivel_acesso?.nome === 'admin') {
          return toast.error("Não pode excluir admin.");
      }
      setUserToDelete(selectedUser);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!userToDelete) return;
      try {
        await api.delete(`/usuarios/${userToDelete.id}`);
        toast.success("Excluído.");
        handleClear();
        loadUsers();
      } catch (error) { 
          toast.error("Erro ao excluir."); 
      } finally {
          setUserToDelete(null);
      }
  };

  return (
    <main className="container grid">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir?"
        message={`Confirmar exclusão de "${userToDelete?.nome}"?`}
        confirmText="Sim"
        isDanger={true}
      />

      <section className="card">
        <h2 className="section-title">
          {selectedUser ? 'Editar' : 'Novo Usuário'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{gridTemplateColumns: '1fr'}}>
            <div>
              <label>Nome</label>
              <input 
                type="text"
                value={form.nome} 
                onChange={e => setForm({...form, nome: e.target.value})} 
                placeholder="Nome completo"
                maxLength={50}
              />
            </div>
            <div>
              <label>Username</label>
              <input 
                type="text"
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})} 
                placeholder="Login"
                maxLength={20}
              />
            </div>
            <div>
              <label>Email</label>
              <input 
                type="email"
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="Email"
              />
            </div>
            <div>
              <label>Tipo</label>
              <select 
                value={form.nivel_acesso_id} 
                onChange={e => setForm({...form, nivel_acesso_id: e.target.value})}
              >
                <option value="2">Testador</option>
                <option value="1">Administrador</option>
              </select>
            </div>
            <div>
              <label>
                {selectedUser ? 'Senha (opcional)' : 'Senha'}
              </label>
              <input 
                type="password" 
                value={form.senha} 
                onChange={e => setForm({...form, senha: e.target.value})} 
                placeholder={selectedUser ? "Manter atual" : "Mínimo 6 caracteres"}
              />
            </div>
          </div>
          
          <div className="actions" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
            <button type="submit" className="btn primary">
              {selectedUser ? 'Atualizar' : 'Salvar'}
            </button>
            
            {selectedUser && (
              <>
                <button 
                    type="button" 
                    onClick={() => toggleActive(selectedUser)} 
                    className="btn" 
                    style={{backgroundColor: selectedUser.ativo ? '#f59e0b' : '#10b981', color: 'white'}}
                >
                    {selectedUser.ativo ? 'Bloquear' : 'Ativar'}
                </button>
                
                <button 
                    type="button" 
                    onClick={requestDelete} 
                    className="btn danger"
                >
                    Excluir
                </button>
                
                <button type="button" onClick={handleClear} className="btn">
                    Cancelar
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h2 className="section-title" style={{margin: 0}}>Utilizadores</h2>
            
            <div ref={wrapperRef} className="search-wrapper">
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                        width: '100%',
                        padding: '8px 30px 8px 10px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.85rem',
                        height: '38px',
                        boxSizing: 'border-box'
                    }}
                />
                <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}>🔍</span>

                {showSuggestions && opcoesParaMostrar.length > 0 && (
                    <ul className="custom-dropdown">
                        {opcoesParaMostrar.map(u => (
                            <li 
                                key={u.id} 
                                onClick={() => {
                                    setSearchTerm(u.nome);
                                    setShowSuggestions(false);
                                }}
                            >
                                <span>
                                    {truncate(u.nome, 25)} 
                                    <span style={{color:'#94a3b8', fontSize:'0.75rem', marginLeft:'8px'}}>({u.username})</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        <div className="table-wrap">
          {loading ? <p style={{textAlign:'center', padding:'20px'}}>Carregando...</p> : (
            <table>
              <thead>
                <tr>
                  <th style={{textAlign: 'left'}}>Username</th>
                  <th style={{textAlign: 'left'}}>Nome</th>
                  <th style={{textAlign: 'left'}}>Email</th>
                  <th style={{textAlign: 'center'}}>Tipo</th>
                  <th style={{textAlign: 'right'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhum usuário encontrado.</td></tr>
                ) : (
                    filteredUsers.map(u => (
                      <tr 
                        key={u.id} 
                        onClick={() => handleSelect(u)} 
                        className={selectedUser?.id === u.id ? 'selected' : 'selectable'}
                      >
                        <td style={{verticalAlign: 'middle'}}>
                            <strong style={{color: '#0369a1', fontFamily: 'monospace'}}>
                                {u.username || '-'}
                            </strong>
                        </td>
                        <td style={{verticalAlign: 'middle'}}>
                            {truncate(u.nome, 20)}
                        </td>
                        <td style={{fontSize: '0.85rem', verticalAlign: 'middle'}}>{truncate(u.email, 25)}</td>
                        <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                          <span className="badge" style={{
                              backgroundColor: u.nivel_acesso?.nome === 'admin' ? '#fee2e2' : '#e0f2fe', 
                              color: u.nivel_acesso?.nome === 'admin' ? '#991b1b' : '#075985'
                          }}>
                              {u.nivel_acesso?.nome || 'N/A'}
                          </span>
                        </td>
                        <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
                          <span className={`badge ${u.ativo ? 'on' : 'off'}`}>
                            {u.ativo ? 'Ativo' : 'Bloq.'}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}