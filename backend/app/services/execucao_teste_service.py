from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile 
from typing import Optional, List 
from app.repositories.execucao_teste_repository import ExecucaoTesteRepository
from app.repositories.ciclo_teste_repository import CicloTesteRepository
from app.repositories.caso_teste_repository import CasoTesteRepository
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoResponse, ExecucaoPassoUpdate
from app.models.testing import StatusExecucaoEnum, StatusPassoEnum
import json
import shutil
import uuid
import os

class ExecucaoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = ExecucaoTesteRepository(db)
        self.ciclo_repo = CicloTesteRepository(db)
        self.caso_repo = CasoTesteRepository(db)

    async def alocar_teste(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        ciclo = await self.ciclo_repo.get_by_id(ciclo_id)
        if not ciclo:
             raise HTTPException(status_code=404, detail="Ciclo não encontrado")
        
        caso = await self.caso_repo.get_by_id(caso_id)
        if not caso:
             raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")

        nova_execucao = await self.repo.criar_planejamento(ciclo_id, caso_id, responsavel_id)
        return ExecucaoTesteResponse.model_validate(nova_execucao)

    async def listar_tarefas_usuario(self, usuario_id: int, status: Optional[StatusExecucaoEnum] = None, skip: int = 0, limit: int = 20):
        items = await self.repo.get_minhas_execucoes(usuario_id, status, skip, limit)
        return [ExecucaoTesteResponse.model_validate(i) for i in items]
    
    async def obter_execucao(self, execucao_id: int):
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao:
            return None
        return ExecucaoTesteResponse.model_validate(execucao)

    async def registrar_resultado_passo(self, passo_id: int, dados: ExecucaoPassoUpdate):
        passo = await self.repo.get_execucao_passo(passo_id)
        if not passo:
             raise HTTPException(status_code=404, detail="Passo da execução não encontrado")
        
        atualizado = await self.repo.update_passo(passo_id, dados)
        
        # Recalcula o status geral com a regra atualizada
        await self._calcular_status_automatico(atualizado.execucao_teste_id)

        return ExecucaoPassoResponse.model_validate(atualizado)
    
    async def _calcular_status_automatico(self, execucao_id: int):
        # Busca todos os passos dessa execução
        passos = await self.repo.listar_passos(execucao_id)
        
        total = len(passos)
        if total == 0:
            return

        # Ajustado para novos enums (passou/falhou) se necessário, 
        # mas mantendo compatibilidade com 'aprovado/reprovado' caso o banco ainda use.
        # Idealmente, deve-se usar StatusPassoEnum.passou e StatusPassoEnum.falhou
        aprovados = sum(1 for p in passos if p.status in [StatusPassoEnum.aprovado, 'passou'])
        reprovados = sum(1 for p in passos if p.status in [StatusPassoEnum.reprovado, 'falhou'])
        bloqueados = sum(1 for p in passos if p.status == StatusPassoEnum.bloqueado)
        pendentes = sum(1 for p in passos if p.status == StatusPassoEnum.pendente)

        novo_status = StatusExecucaoEnum.em_progresso

        if pendentes == 0:
            # Todos os passos foram executados
            if reprovados > 0 or bloqueados > 0:
                # Se houve falha, o status geral vai para Reteste 
                novo_status = StatusExecucaoEnum.reteste 
            else:
                # Se todos foram aprovados
                novo_status = StatusExecucaoEnum.fechado
        else:
            # Ainda tem coisa para fazer
            novo_status = StatusExecucaoEnum.em_progresso

        # Atualiza o status geral da execução
        await self.repo.atualizar_status_geral(execucao_id, novo_status)

    async def finalizar_execucao(self, execucao_id: int, status_final: StatusExecucaoEnum):
        return await self.repo.update_status_geral(execucao_id, status_final)
    
    async def upload_evidencia(self, passo_id: int, file: UploadFile):
        passo_atual = await self.repo.get_execucao_passo(passo_id)
        if not passo_atual:
             raise HTTPException(status_code=404, detail="Passo não encontrado")

        evidencias_lista = []
        if passo_atual.evidencias:
            try:
                evidencias_lista = json.loads(passo_atual.evidencias)
                if not isinstance(evidencias_lista, list):
                    evidencias_lista = [passo_atual.evidencias]
            except:
                evidencias_lista = [passo_atual.evidencias]

        if len(evidencias_lista) >= 3:
            raise HTTPException(status_code=400, detail="Limite de 3 evidências atingido.")

        os.makedirs("evidencias", exist_ok=True) 
        extensao = file.filename.split(".")[-1]
        nome_arquivo = f"{uuid.uuid4()}.{extensao}"
        caminho_arquivo = f"evidencias/{nome_arquivo}"
        
        with open(caminho_arquivo, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        url_publica = f"http://localhost:8000/{caminho_arquivo}"
        
        evidencias_lista.append(url_publica)
        
        dados_update = ExecucaoPassoUpdate(evidencias=json.dumps(evidencias_lista))
        await self.repo.update_passo(passo_id, dados_update)
        
        return {"url": url_publica, "lista_completa": evidencias_lista}