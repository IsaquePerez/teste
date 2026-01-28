import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { SmartTable } from '../../components/SmartTable';
import { Trash } from '../../components/icons/Trash';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import './styles.css'; 

export function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error, success } = useSnackbar();
  const { user } = useAuth();
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.nivel_acesso?.nome === 'admin';

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/logs/');
      setLogs(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error(err);
      error("Não foi possível carregar o histórico de logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (log) => {
      setLogToDelete(log);
      setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
      if(!logToDelete) return;
      try {
          await api.delete(`/logs/${logToDelete.id}`);
          success("Registro de log removido com sucesso.");
          loadLogs();
      } catch(e) {
          console.error(e);
          error("Erro ao remover o registro.");
      } finally {
          setIsDeleteOpen(false);
          setLogToDelete(null);
      }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };
  const columns = useMemo(() => [
    { 
        header: 'ID', 
        accessor: 'id', 
        width: '60px' 
    },
    { 
        header: 'Data / Hora', 
        accessor: 'created_at', 
        width: '160px',
        render: (row) => (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {formatDate(row.created_at)}
            </span>
        )
    },
    { 
        header: 'Usuário', 
        accessor: 'usuario_nome', 
        width: '180px',
        render: (row) => {
            const initial = row.usuario_nome ? row.usuario_nome.charAt(0).toUpperCase() : '?';
            return (
                <div className="log-user-cell">
                    <div className="log-user-avatar">{initial}</div>
                    <span style={{ fontWeight: 500 }}>{row.usuario_nome || 'Sistema'}</span>
                </div>
            );
        }
    },
    { 
        header: 'Ação', 
        accessor: 'acao', 
        width: '120px',
        render: (row) => (
            <span className={`log-action-badge log-action-${row.acao}`}>
                {row.acao}
            </span>
        )
    },
    { 
        header: 'Entidade', 
        accessor: 'entidade', 
        width: '120px',
        render: (row) => (
            <span className="log-entidade-badge">
                {row.entidade} #{row.entidade_id || '?'}
            </span>
        )
    },
    { 
        header: 'Detalhes', 
        accessor: 'detalhes',
        render: (row) => (
            <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                {row.detalhes || '-'}
            </span>
        )
    },
    {
        header: '',
        accessor: 'actions',
        width: '60px',
        render: (row) => isAdmin && (
            <button 
                onClick={() => handleDeleteRequest(row)} 
                className="btn danger small btn-action-icon" 
                title="Excluir Registro de Auditoria"
                style={{ padding: '6px' }}
            >
                <Trash size={16} />
            </button>
        )
    }
  ], [isAdmin]);

  return (
    <main className="container">
      
      <ConfirmationModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Registro de Auditoria?"
        message="Atenção: Esta ação é irreversível e remove o rastro de auditoria desta operação."
        isDanger={true}
      />

      <section className="card" style={{ marginTop: 0, padding: '24px' }}>
        <div className="toolbar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 className="page-title" style={{ marginBottom: 0 }}>Logs do Sistema</h3>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                    Monitoramento de atividades e auditoria de ações dos utilizadores.
                </span>
            </div>
            
            <div className="toolbar-actions">
                <button 
                    onClick={loadLogs} 
                    className="btn secondary small" 
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {loading ? 'Atualizando...' : 'Atualizar Lista'}
                </button>
            </div>
        </div>

        <div className="table-wrap" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <SmartTable 
                columns={columns}
                data={logs}
                title="" 
            />
        </div>
      </section>
    </main>
  );
}