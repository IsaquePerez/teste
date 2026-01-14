import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const { success, error, warning } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado',
    projeto_id: ''
  });

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
    const loadProjetos = async () => {
      try {
        const data = await api.get("/projetos");
        setProjetos(data || []);

        const ativos = (data || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) {
          setSelectedProjeto(ativos[0].id);
        }
      } catch (err) {
        error("Erro ao carregar projetos.");
      }
    };
    loadProjetos();
  }, []);

  useEffect(() => {
    if (selectedProjeto) {
      loadCiclos(selectedProjeto);
    } else {
      setCiclos([]);
    }
  }, [selectedProjeto]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (err) {
      error("Erro ao carregar ciclos.");
      setCiclos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCiclos = ciclos.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dropdownOptions = searchTerm === ''
    ? [...ciclos].sort((a, b) => b.id - a.id).slice(0, 5)
    : filteredCiclos.slice(0, 5);

  const totalPages = Math.ceil(filteredCiclos.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCiclos = filteredCiclos.slice(indexOfFirstItem, indexOfLastItem);

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

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const getNextDayString = (dateString) => {
    if (!dateString) return getTodayString();
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const getProjetoName = (id) => projetos.find(p => p.id === id)?.nome || '-';
  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const datePart = dateStr.toString().split('T')[0];
    const [ano, mes, dia] = datePart.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    setForm({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      status: 'planejado',
      projeto_id: selectedProjeto || ''
    });
    setEditingId(null);
    setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
    handleReset();
    setView('form');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      data_inicio: item.data_inicio ? item.data_inicio.split('T')[0] : '',
      data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
      status: item.status,
      projeto_id: item.projeto_id || selectedProjeto
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim()) return warning("Nome do ciclo é obrigatório.");
    if (!form.projeto_id) return warning("Selecione um projeto.");
    if (!form.data_inicio || !form.data_fim) return warning("Datas de início e fim são obrigatórias.");

    const payload = {
      ...form,
      projeto_id: parseInt(form.projeto_id)
    };

    try {
      if (editingId) {
        await api.put(`/testes/ciclos/${editingId}`, payload);
        success("Ciclo atualizado!");
      } else {
        await api.post(`/testes/projetos/${form.projeto_id}/ciclos`, payload);
        success("Ciclo criado!");
      }
      handleReset();

      if (selectedProjeto == form.projeto_id) {
        loadCiclos(selectedProjeto);
      } else {
        setSelectedProjeto(form.projeto_id);
      }
    } catch (err) {
      console.error("Erro ao salvar ciclo:", err);
      const msg = err.response?.data?.detail || "Erro ao salvar ciclo.";
      const errorMsg = Array.isArray(msg) ? `${msg[0].loc[1]}: ${msg[0].msg}` : msg;
      error(errorMsg);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/testes/ciclos/${itemToDelete.id}`);
      success("Ciclo excluído.");
      loadCiclos(selectedProjeto);
    } catch (e) {
      error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <main className="container">
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ciclo?"
        message={`Deseja excluir "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                <h3 className="form-title">{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-grid">
                  <div>
                    <label className="input-label">Projeto Pai <span className="required-asterisk">*</span></label>
                    <select
                      value={form.projeto_id} onChange={e => setForm({ ...form, projeto_id: e.target.value })}
                      className="form-control bg-gray"
                      disabled={!!editingId}
                    >
                      <option value="">Selecione um projeto...</option>
                      {projetos.filter(p => p.status === 'ativo').map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Nome do Ciclo <span className="required-asterisk">*</span></label>
                    <input
                      value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                      className="form-control" placeholder="Ex: Sprint 24"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Descrição</label>
                  <textarea
                    rows={2}
                    value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <div>
                    <label className="input-label">Data Início <span className="required-asterisk">*</span></label>
                    <input
                      type="date"
                      value={form.data_inicio}
                      min={!editingId ? getTodayString() : undefined}
                      disabled={!!editingId}
                      onChange={e => {
                        const novaData = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          data_inicio: novaData,
                          data_fim: prev.data_fim && prev.data_fim <= novaData ? '' : prev.data_fim
                        }))
                      }}
                      className={`form-control ${!!editingId ? 'bg-gray' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="input-label">Data Fim <span className="required-asterisk">*</span></label>
                    <input
                      type="date"
                      value={form.data_fim}
                      min={getNextDayString(form.data_inicio)}
                      disabled={!form.data_inicio}
                      onChange={e => setForm({ ...form, data_fim: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="input-label">Status</label>
                    <select
                      value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="form-control bg-gray"
                    >
                      <option value="planejado">Planejado</option>
                      <option value="em_execucao">Em Execução</option>
                      <option value="concluido">Concluído</option>
                      <option value="pausado">Pausado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                <button type="submit" className="btn primary">Salvar Ciclo</button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{ marginTop: 0 }}>
          <div className="toolbar">
            <h2 className="page-title">Ciclos de Teste</h2>
            <div className="toolbar-actions">

              <div className="filter-group">
                <span className="filter-label">PROJETO:</span>
                <select
                  value={selectedProjeto}
                  onChange={e => setSelectedProjeto(e.target.value)}
                  className="select-filter"
                >
                  {projetos.filter(p => p.status === 'ativo').map(p => (
                    <option key={p.id} value={p.id}>{truncate(p.nome, 25)}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNew}
                className="btn primary btn-new"
                disabled={!isProjectActive}
              >
                Novo Ciclo
              </button>

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

                {showSuggestions && dropdownOptions.length > 0 && (
                  <ul className="custom-dropdown">
                    {dropdownOptions.map(c => (
                      <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>{truncate(c.nome, 20)}</span>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                            {c.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {loading ? <div className="loading-text">Carregando dados...</div> : (
            <div className="table-wrap">
              <div className="content-area">
                {filteredCiclos.length === 0 ? (
                  <div className="empty-container">
                    <p style={{ marginBottom: '10px' }}>Nenhum ciclo encontrado.</p>
                    {isProjectActive && <button onClick={handleNew} className="btn primary small">Criar o primeiro</button>}
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>ID</th>
                        <th>Ciclo</th>
                        <th>Projeto</th>
                        <th style={{ textAlign: 'center' }}>Período</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCiclos.map(item => (
                        <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                          <td className="cell-id">#{item.id}</td>
                          <td>
                            <div className="cell-name">{item.nome}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{item.descricao}</div>
                          </td>
                          <td style={{ color: '#64748b' }}>{getProjetoName(item.projeto_id)}</td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                            {formatDate(item.data_inicio)} <span style={{ margin: '0 5px' }}>à</span> {formatDate(item.data_fim)}
                          </td>
                          <td className="cell-status">
                            <span className={`status-badge ${item.status}`}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="cell-actions">
                            <button
                              onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }}
                              className="btn danger small btn-action-icon"
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