import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminSistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [editingId, setEditingId] = useState(null);

  const { success, error, warning } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sistemaToDelete, setSistemaToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 40) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  useEffect(() => { loadSistemas(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const loadSistemas = async () => {
    setLoading(true);
    try {
      const data = await api.get("/sistemas/");
      setSistemas(Array.isArray(data) ? data : []);
    } catch (err) {
      error("Erro ao carregar sistemas.");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setForm({ nome: '', descricao: '' });
    setEditingId(null);
    setView('form');
  };

  const handleCancel = () => {
    setForm({ nome: '', descricao: '' });
    setEditingId(null);
    setView('list');
  };

  const handleSelectRow = (s) => {
    setForm({ nome: s.nome, descricao: s.descricao });
    setEditingId(s.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      warning("Por favor, preencha o nome do sistema.");
      return;
    }

    const nomeNormalizado = form.nome.trim().toLowerCase();
    const duplicado = sistemas.some(s => s.nome.trim().toLowerCase() === nomeNormalizado && s.id !== editingId);

    if (duplicado) {
      warning("Já existe um Sistema com este nome.");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/sistemas/${editingId}`, form);
        success("Sistema atualizado com sucesso!");
      } else {
        await api.post("/sistemas/", { ...form, ativo: true });
        success("Sistema cadastrado com sucesso!");
      }
      loadSistemas();
      handleCancel();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar sistema.";
      error(msg);
    }
  };

  const toggleActive = async (sistema) => {
    try {
      const novoStatus = !sistema.ativo;
      await api.put(`/sistemas/${sistema.id}`, { ativo: novoStatus });
      success(`Sistema ${novoStatus ? 'ativado' : 'desativado'}!`);
      setSistemas(prev => prev.map(s => s.id === sistema.id ? { ...s, ativo: novoStatus } : s));
    } catch (e) {
      error("Erro ao alterar status.");
    }
  };

  const requestDelete = (sistema) => {
    setSistemaToDelete(sistema);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!sistemaToDelete) return;
    try {
      await api.delete(`/sistemas/${sistemaToDelete.id}`);
      success("Sistema excluído com sucesso.");
      loadSistemas();
      if (editingId === sistemaToDelete.id) handleCancel();
    } catch (err) {
      error("Não foi possível excluir. Verifique se existem vínculos.");
    } finally {
      setSistemaToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const filteredSistemas = sistemas.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const opcoesParaMostrar = searchTerm === ''
    ? [...sistemas].sort((a, b) => b.id - a.id).slice(0, 5)
    : filteredSistemas.slice(0, 5);

  const totalPages = Math.ceil(filteredSistemas.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSistemas = filteredSistemas.slice(indexOfFirstItem, indexOfLastItem);

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
        onConfirm={confirmDelete}
        title="Excluir Sistema?"
        message={`Tem certeza que deseja excluir "${sistemaToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {view === 'form' && (
        <section className="card form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="form-header">
            <h2 className="section-title">{editingId ? 'Editar Sistema' : 'Novo Sistema'}</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label className="input-label">Nome</label>
                <input
                  maxLength={50}
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="form-control"
                  placeholder="Nome do sistema"
                />
              </div>
              <div>
                <label className="input-label">Descrição</label>
                <input
                  maxLength={100}
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="form-control"
                  placeholder="Descrição breve"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
              <button type="submit" className="btn primary">{editingId ? 'Salvar' : 'Criar'}</button>
            </div>
          </form>
        </section>
      )}

      {view === 'list' && (
        <section className="card" style={{ marginTop: 0 }}>
          <div className="toolbar">
            <h2 className="page-title">Sistemas</h2>

            <div className="toolbar-actions">
              <button onClick={handleNew} className="btn primary btn-new">Novo Sistema</button>
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
                {showSuggestions && opcoesParaMostrar.length > 0 && (
                  <ul className="custom-dropdown">
                    {opcoesParaMostrar.map(s => (
                      <li key={s.id} onClick={() => { setSearchTerm(s.nome); setShowSuggestions(false); }}>
                        {truncate(s.nome, 30)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="content-area">
              {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>Carregando...</p> : (
                sistemas.length === 0 ? <p className="no-results">Nenhum sistema cadastrado.</p> : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Nome</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSistemas.length === 0 ? (
                        <tr><td colSpan="3" className="no-results">Nenhum sistema encontrado.</td></tr>
                      ) : (
                        currentSistemas.map(s => (
                          <tr key={s.id} onClick={() => handleSelectRow(s)} className="selectable" style={{ opacity: s.ativo ? 1 : 0.6 }}>
                            <td className="cell-name">
                              <strong title={s.nome}>{truncate(s.nome)}</strong>
                              <div title={s.descricao}>{truncate(s.descricao, 40)}</div>
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span onClick={(e) => { e.stopPropagation(); toggleActive(s); }} className={`badge ${s.ativo ? 'on' : 'off'}`} style={{ cursor: 'pointer' }}>
                                {s.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="cell-actions">
                              <button onClick={(e) => { e.stopPropagation(); requestDelete(s); }} className="btn danger small">🗑️</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )
              )}
            </div>

            <div className="pagination-container">
              <button onClick={() => paginate(1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn">«</button>
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn">‹</button>

              {getPaginationGroup().map((item) => (
                <button
                  key={item}
                  onClick={() => paginate(item)}
                  className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                >
                  {item}
                </button>
              ))}

              {totalPages === 0 && <button className="pagination-btn active" disabled>1</button>}

              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn">›</button>
              <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn">»</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}