import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

// Componente Reutilizável mantido aqui por conveniência
const SearchableSelect = ({ options, value, onChange, placeholder, disabled, labelKey = 'nome' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n = 35) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    if (selectedOption) {
      setSearchTerm(selectedOption[labelKey]);
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, options, labelKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selectedOption = options.find(opt => String(opt.id) === String(value));
        setSearchTerm(selectedOption ? selectedOption[labelKey] : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options, labelKey]);

  const filteredOptions = options.filter(opt =>
    opt[labelKey].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayOptions = filteredOptions.slice(0, 5);

  const handleSelect = (option) => {
    onChange(option.id);
    setSearchTerm(option[labelKey]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="search-wrapper" style={{ width: '100%', position: 'relative' }}>
      <input
        type="text"
        className={`form-control ${disabled ? 'bg-gray' : ''}`}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'text', paddingRight: '30px' }}
      />
      <span
        className="search-icon"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', right: '10px', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        ▼
      </span>

      {isOpen && !disabled && (
        <ul className="custom-dropdown" style={{ width: '100%', top: '100%', zIndex: 1000 }}>
          {displayOptions.length === 0 ? (
            <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>Sem resultados</li>
          ) : (
            displayOptions.map(opt => (
              <li key={opt.id} onClick={() => handleSelect(opt)} title={opt[labelKey]}>
                {truncate(opt[labelKey], 35)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export function AdminProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const { success, error, warning } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    status: 'ativo',
    sistema_id: '',
    modulo_id: '',
    responsavel_id: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 25) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, sisData, modData, userData] = await Promise.all([
        api.get("/projetos"),
        api.get("/sistemas/"),
        api.get("/modulos/"),
        api.get("/usuarios/")
      ]);

      setProjetos(Array.isArray(projData) ? projData : []);
      setSistemas(Array.isArray(sisData) ? sisData : []);
      setModulos(Array.isArray(modData) ? modData : []);
      setUsuarios(Array.isArray(userData) ? userData : []);

    } catch (err) {
      error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      nome: '',
      descricao: '',
      status: 'ativo',
      sistema_id: '',
      modulo_id: '',
      responsavel_id: ''
    });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      status: item.status,
      sistema_id: item.sistema_id || '',
      modulo_id: item.modulo_id || '',
      responsavel_id: item.responsavel_id || ''
    });
    setEditingId(item.id);
    setView('form');
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return warning("Nome é obrigatório.");
    if (!form.sistema_id) return warning("Selecione um Sistema.");
    if (!form.modulo_id) return warning("Selecione um Módulo.");
    if (!form.responsavel_id) return warning("Selecione um Responsável.");

    const payload = {
      ...form,
      sistema_id: parseInt(form.sistema_id),
      modulo_id: parseInt(form.modulo_id),
      responsavel_id: parseInt(form.responsavel_id)
    };

    try {
      if (editingId) {
        await api.put(`/projetos/${editingId}`, payload);
        success("Projeto atualizado!");
      } else {
        await api.post("/projetos", payload);
        success("Projeto criado!");
      }
      handleReset();
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar projeto.";
      error(typeof msg === 'string' ? msg : "Erro de validação.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/projetos/${itemToDelete.id}`);
      success("Projeto excluído.");
      loadData();
    } catch (e) {
      error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const modulosFiltrados = form.sistema_id
    ? modulos.filter(m => m.sistema_id == form.sistema_id)
    : modulos;

  const admins = usuarios
    .filter(u => u.nivel_acesso_id === 1 && u.ativo)
    .map(u => ({
      ...u,
      labelCompleto: `${u.nome} ${u.username ? `(@${u.username})` : ''}`
    }));

  const filteredData = projetos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const opcoesParaMostrar = searchTerm === ''
    ? [...projetos].sort((a, b) => b.id - a.id).slice(0, 5)
    : filteredData.slice(0, 5);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

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
        title="Excluir Projeto?"
        message={`Deseja excluir "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                <h3 className="form-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className="input-label">Nome do Projeto <span className="required-asterisk">*</span></label>
                  <input
                    value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="form-control" placeholder="Ex: E-commerce 2.0"
                  />
                </div>
                <div>
                  <label className="input-label">Descrição</label>
                  <textarea
                    value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                    className="form-control" rows="3"
                  />
                </div>
                <div className="form-grid">
                  <div>
                    <label className="input-label">Sistema <span className="required-asterisk">*</span></label>
                    <SearchableSelect
                      options={sistemas}
                      value={form.sistema_id}
                      onChange={(val) => setForm({ ...form, sistema_id: val, modulo_id: '' })}
                      placeholder="Busque o sistema..."
                      labelKey="nome"
                    />
                  </div>
                  <div>
                    <label className="input-label">Módulo <span className="required-asterisk">*</span></label>
                    <SearchableSelect
                      options={modulosFiltrados}
                      value={form.modulo_id}
                      onChange={(val) => setForm({ ...form, modulo_id: val })}
                      placeholder={form.sistema_id ? "Busque o módulo..." : "Selecione um sistema antes"}
                      disabled={!form.sistema_id}
                      labelKey="nome"
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div>
                    <label className="input-label">Responsável (Admin) <span className="required-asterisk">*</span></label>
                    <SearchableSelect
                      options={admins}
                      value={form.responsavel_id}
                      onChange={(val) => setForm({ ...form, responsavel_id: val })}
                      placeholder="Busque o responsável..."
                      labelKey="labelCompleto"
                    />
                  </div>
                  <div>
                    <label className="input-label">Status</label>
                    <select
                      value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="form-control bg-gray"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="pausado">Pausado</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                <button type="submit" className="btn primary">Salvar</button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{ marginTop: 0 }}>
          <div className="toolbar">
            <h2 className="page-title">Projetos</h2>
            <div className="toolbar-actions">
              <button onClick={() => setView('form')} className="btn primary btn-new">Novo Projeto</button>
              <div className="separator"></div>
              <div ref={wrapperRef} className="search-wrapper">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>

                {showSuggestions && (
                  <ul className="custom-dropdown">
                    {opcoesParaMostrar.length === 0 ? (
                      <li style={{ color: '#999', cursor: 'default' }}>Nenhum projeto encontrado.</li>
                    ) : (
                      opcoesParaMostrar.map(p => (
                        <li key={p.id} onClick={() => { setSearchTerm(p.nome); setShowSuggestions(false); }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{truncate(p.nome, 25)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>{p.status}</span>
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
                {filteredData.length === 0 ? (
                  <div className="empty-container">Nenhum projeto cadastrado.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>ID</th>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Responsável</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map(item => (
                        <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                          <td className="cell-id">#{item.id}</td>
                          <td className="cell-name">{item.nome}</td>
                          <td style={{ color: '#64748b' }}>{truncate(item.descricao, 30)}</td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {(() => {
                              const resp = usuarios.find(u => u.id === item.responsavel_id);
                              if (resp) {
                                return (
                                  <div>
                                    <span>{resp.nome}</span>
                                    {resp.username && (
                                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '6px' }}>
                                        (@{resp.username})
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return '-';
                            })()}
                          </td>
                          <td className="cell-status">
                            <span className={`status-badge ${item.status}`}>{item.status}</span>
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