import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext'; 

import { ConfirmationModal } from '../../components/ConfirmationModal';
import { DefectModal } from '../../components/DefectModal';
import { TaskSidebar } from './TaskSidebar';
import { ExecutionPlayer } from './ExecutionPlayer';
import { EvidenceGallery } from './EvidenceGallery';
import styles from './styles.module.css';

export function QARunner() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExecucao, setActiveExecucao] = useState(null);
  const [galleryImages, setGalleryImages] = useState(null);
  const [currentFailedStep, setCurrentFailedStep] = useState(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  
  const { success, error, info } = useSnackbar();

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false
  });

  useEffect(() => { loadMinhasTarefas(); }, []);

  const loadMinhasTarefas = async () => {
    setLoading(true);
    try {
        const data = await api.get("/testes/minhas-tarefas");
        setTarefas(Array.isArray(data) ? data : []);
    } catch (e) { 
        error("Não foi possível carregar suas tarefas.");
    } finally { 
        setLoading(false); 
    }
  };

  const selectTask = async (t) => {
    if (activeExecucao?.id === t.id) return;
    try {
        const data = await api.get(`/testes/execucoes/${t.id}`);
        setActiveExecucao(data);

        
       
    } catch (e) { 
        error("Erro ao carregar execução."); 
    }
  };

  const startExecution = async () => {
    if (!activeExecucao) return;
    try {
        await api.put(`/testes/execucoes/${activeExecucao.id}/finalizar?status=em_progresso`);
        setTarefas(prev => prev.map(task => 
          task.id === activeExecucao.id ? {...task, status_geral: 'em_progresso'} : task
        ));
        setActiveExecucao(prev => ({ ...prev, status_geral: 'em_progresso' }));
        success("Teste iniciado!");
    } catch (e) { 
        error("Erro ao iniciar teste."); 
    }
  };
  
  const handleStepAction = (passoId, acao) => {
      // Bloqueio de segurança que você tinha
      const passo = activeExecucao.passos_executados.find(p => p.id === passoId);
      if (passo && (passo.status === 'aprovado' || passo.status === 'reprovado')) {
          info("Este passo já foi avaliado.");
          return;
      }

      if (acao === 'aprovado') {
          updatePasso(passoId, 'aprovado');
          success("Passo aprovado.");
      } else {
          setCurrentFailedStep(passoId);
          setIsDefectModalOpen(true);
      }
  };

  const updatePasso = async (passoId, status) => {
      try {
          await api.put(`/testes/execucoes/passos/${passoId}`, { status }); // Ajustei endpoint para padrão REST se necessário
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, status };
              return p;
          });
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
      } catch (err) { error("Erro ao atualizar passo."); }
  };

  const requestFinishExecution = () => {
    const passos = activeExecucao?.passos_executados || [];
    const allPassed = passos.length > 0 && passos.every(p => p.status === 'aprovado');
    const statusFinal = allPassed ? 'passou' : 'falhou';

    setConfirmModal({
        isOpen: true,
        title: "Finalizar Teste?",
        message: `Status final será "${statusFinal.toUpperCase()}". Continuar?`,
        isDanger: !allPassed,
        onConfirm: () => finishExecutionConfirm(statusFinal)
    });
  };

  const finishExecutionConfirm = async (statusFinal) => {
      try {
          await api.put(`/testes/execucoes/${activeExecucao.id}/finalizar?status=${statusFinal}`);
          setActiveExecucao(prev => ({ ...prev, status_geral: statusFinal }));
          success(`Teste finalizado: ${statusFinal.toUpperCase()}`);
          loadMinhasTarefas(); 
      } catch (err) { error("Erro ao finalizar execução."); }
  };

  const handleFileUpload = async (e, passoId) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      info('Enviando evidência...');

      try {
          // Usando a URL correta baseada na sua versão
          const response = await api.post(`/testes/passos/${passoId}/evidencia`, formData);
          const data = response.data || response;
          const novaListaJSON = JSON.stringify(data.lista_completa || [data.url]); 
          
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, evidencias: novaListaJSON };
              return p;
          });
          
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
          success('Evidência anexada!');
      } catch (err) {
          console.error(err);
          error('Erro no upload da evidência');
      }
  };

  const requestDeleteEvidence = (passoId, urlToDelete) => {
      setConfirmModal({
          isOpen: true, title: "Remover imagem?", message: "Ação irreversível.", isDanger: true,
          onConfirm: () => confirmDeleteEvidence(passoId, urlToDelete)
      });
  };

  const confirmDeleteEvidence = async (passoId, urlToDelete) => {
      try {
          const getEvidencias = (str) => { try { return JSON.parse(str); } catch { return []; } };
          const passo = activeExecucao.passos_executados.find(p => p.id === passoId);
          const listaAtual = Array.isArray(passo.evidencias) ? passo.evidencias : getEvidencias(passo.evidencias);
          
          const novaLista = listaAtual.filter(url => url !== urlToDelete);
          const novoJSON = JSON.stringify(novaLista);

          await api.put(
  `/testes/execucoes/passos/${passoId}`,
  { evidencias: novoJSON }
);
          
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, evidencias: novoJSON };
              return p;
          });
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
          setGalleryImages(null);
          success("Imagem removida.");
      } catch (err) { error("Erro ao remover."); }
  };

  const handleDefectConfirm = async (defectData) => {
      try {
          const passoFalho = activeExecucao.passos_executados.find(p => p.id === currentFailedStep);
          let evidenciasFinais = defectData.evidencias;
          if (!evidenciasFinais && passoFalho?.evidencias) {
              evidenciasFinais = passoFalho.evidencias;
          }

          await api.post("/defeitos/", { 
              ...defectData, evidencias: evidenciasFinais, status: 'aberto', execucao_teste_id: activeExecucao.id 
          });

          await updatePasso(currentFailedStep, 'reprovado');
          success("Defeito registrado.");
          setIsDefectModalOpen(false);
      } catch (err) { error("Erro ao registrar defeito."); }
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} isDanger={confirmModal.isDanger}
      />
      <DefectModal isOpen={isDefectModalOpen} onClose={() => setIsDefectModalOpen(false)} onConfirm={handleDefectConfirm} />

      <h2 className="section-title" style={{marginBottom: '15px' }}>Minhas Tarefas</h2>
      
      <div className={styles.container}>
          <TaskSidebar 
              tasks={tarefas} 
              loading={loading} 
              activeExecId={activeExecucao?.id} 
              onSelect={selectTask} 
          />

          <ExecutionPlayer 
              tasks={tarefas}
              execution={activeExecucao}
              onStart={startExecution} 
              onFinish={requestFinishExecution}
              onStepAction={handleStepAction}
              onUpload={handleFileUpload}
              onDeleteEvidence={requestDeleteEvidence}
              onViewGallery={setGalleryImages}
          />
      </div>

      <EvidenceGallery 
          images={galleryImages} 
          onClose={() => setGalleryImages(null)} 
      />
    </main>
  );
}