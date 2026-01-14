import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminModulos() {
    const [modulos, setModulos] = useState([]);
    const [sistemas, setSistemas] = useState([]);
    const [view, setView] = useState('list');
    const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '' });
    const [editingId, setEditingId] = useState(null);

    const { success, error, warning } = useSnackbar();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [moduloToDelete, setModuloToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

    useEffect(() => { loadData(); }, []);

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

    const loadData = async () => {
        try {
            const [modsResponse, sisResponse] = await Promise.all([
                api.get("/modulos/"),
                api.get("/sistemas/")
            ]);

            const mods = modsResponse.data || modsResponse;
            const sis = sisResponse.data || sisResponse;

            setModulos(Array.isArray(mods) ? mods : []);
            setSistemas(Array.isArray(sis) ? sis : []);

            const ativos = (Array.isArray(sis) ? sis : []).filter(s => s.ativo);
            if (view === 'form' && !editingId && ativos.length > 0) {
                setForm(f => ({ ...f, sistema_id: ativos[0].id }));
            }
        } catch (e) {
            error("Erro ao carregar dados. Tente recarregar a página.");
        }
    };

    const handleNew = () => {
        handleCancel();
        setView('form');
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.sistema_id) {
            warning("Por favor, selecione o Sistema Pai.");
            return;
        }

        if (!form.nome.trim()) {
            warning("Por favor, preencha o nome do módulo.");
            return;
        }

        const nomeNormalizado = form.nome.trim().toLowerCase();
        const sistemaIdSelecionado = parseInt(form.sistema_id);

        const duplicado = modulos.some(m =>
            m.sistema_id === sistemaIdSelecionado &&
            m.nome.trim().toLowerCase() === nomeNormalizado &&
            m.id !== editingId
        );

        if (duplicado) {
            warning("Já existe um módulo com este nome neste sistema.");
            return;
        }

        try {
            const payload = { ...form, sistema_id: sistemaIdSelecionado };

            if (editingId) {
                await api.put(`/modulos/${editingId}`, payload);
                success("Módulo atualizado com sucesso!");
            } else {
                await api.post("/modulos/", { ...payload, ativo: true });
                success("Módulo cadastrado com sucesso!");
            }

            handleCancel();
            loadData();
            setView('list');

        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Erro ao salvar o registro.";
            error(msg);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setForm(f => ({ ...f, nome: '', descricao: '' }));
        setView('list');

        const ativos = sistemas.filter(s => s.ativo);
        if (ativos.length > 0) {
            setForm(f => ({ ...f, sistema_id: ativos[0].id }));
        }
    };

    const handleSelectRow = (modulo) => {
        setForm({ nome: modulo.nome, descricao: modulo.descricao, sistema_id: modulo.sistema_id });
        setEditingId(modulo.id);
        setView('form');
    };

    const toggleActive = async (modulo) => {
        try {
            const novoStatus = !modulo.ativo;
            await api.put(`/modulos/${modulo.id}`, { ativo: novoStatus });
            success(`Módulo "${modulo.nome}" ${novoStatus ? 'ativado' : 'desativado'}.`);
            setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ativo: novoStatus } : m));
        } catch (e) {
            error("Não foi possível alterar o status do módulo.");
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
            success("Módulo excluído com sucesso.");
            setModulos(prev => prev.filter(m => m.id !== moduloToDelete.id));
            if (editingId === moduloToDelete.id) handleCancel();
        } catch (err) {
            error("Não é possível excluir este módulo pois ele possui dependências.");
        } finally {
            setModuloToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || '-';
    const sistemasAtivos = sistemas.filter(s => s.ativo);

    const filteredModulos = modulos.filter(m =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const opcoesParaMostrar = searchTerm === ''
        ? [...modulos].sort((a, b) => b.id - a.id).slice(0, 5)
        : filteredModulos.slice(0, 5);

    const totalPages = Math.ceil(filteredModulos.length / itemsPerPage);

    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentModulos = filteredModulos.slice(indexOfFirstItem, indexOfLastItem);

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
                title="Excluir Módulo?"
                message={`Tem certeza que deseja excluir "${moduloToDelete?.nome}"?`}
                confirmText="Sim, Excluir"
                isDanger={true}
            />

            {view === 'form' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <section className="card form-card">
                        <div className="form-header">
                            <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div>
                                    <label className="input-label">Sistema Pai</label>
                                    <select
                                        value={form.sistema_id}
                                        onChange={e => setForm({ ...form, sistema_id: e.target.value })}
                                        className="form-control"
                                    >
                                        <option value="">Selecione...</option>
                                        {sistemasAtivos.map(s => <option key={s.id} value={s.id}>{truncate(s.nome)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label">Nome do Módulo</label>
                                    <input
                                        value={form.nome}
                                        onChange={e => setForm({ ...form, nome: e.target.value })}
                                        placeholder="Ex: Contas a Pagar"
                                        className="form-control"
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Descrição</label>
                                    <input
                                        value={form.descricao}
                                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                                        placeholder="Descrição"
                                        className="form-control"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Criar Módulo'}</button>
                                <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {view === 'list' && (
                <section className="card">
                    <div className="toolbar">
                        <h2 className="page-title">Módulos</h2>
                        <div className="toolbar-actions">
                            <button onClick={handleNew} className="btn primary btn-new">Novo Módulo</button>
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
                                        {opcoesParaMostrar.map(m => (
                                            <li key={m.id} onClick={() => { setSearchTerm(m.nome); setShowSuggestions(false); }}>
                                                {truncate(m.nome, 30)}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <div className="content-area">
                            {modulos.length === 0 ? <p className="no-results">Nenhum módulo cadastrado.</p> : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>Módulo</th>
                                            <th style={{ textAlign: 'left' }}>Sistema</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredModulos.length === 0 ? (
                                            <tr><td colSpan="4" className="no-results">Nenhum módulo encontrado.</td></tr>
                                        ) : (
                                            currentModulos.map(m => (
                                                <tr key={m.id} onClick={() => handleSelectRow(m)} className={'selectable'} style={{ opacity: m.ativo ? 1 : 0.6 }}>
                                                    <td className="cell-name">
                                                        <strong title={m.nome}>{truncate(m.nome)}</strong>
                                                        <div title={m.descricao} className="muted">{truncate(m.descricao, 40)}</div>
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        <span className="badge system">{truncate(getSistemaName(m.sistema_id), 20)}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span onClick={(e) => { e.stopPropagation(); toggleActive(m); }} className={`badge ${m.ativo ? 'on' : 'off'}`} style={{ cursor: 'pointer' }}>
                                                            {m.ativo ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="cell-actions">
                                                        <button onClick={(e) => { e.stopPropagation(); requestDelete(m); }} className="btn danger small" title="Excluir">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
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