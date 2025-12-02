from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.repositories.teste_repository import TesteRepository
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteUpdate
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteUpdate
from app.schemas.execucao_teste import ExecucaoPassoUpdate
from app.models.testing import StatusExecucaoEnum, StatusPassoEnum
from datetime import datetime

MESES_PT = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Março",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro"
}

class TesteService:
    def __init__(self, db: AsyncSession):
        self.repo = TesteRepository(db)

    # --- GESTÃO DE CASOS E CICLOS ---

    async def criar_caso_teste(self, projeto_id: int, dados: CasoTesteCreate):
        novo_caso = await self.repo.create_caso_teste(projeto_id, dados)
        if dados.ciclo_id and dados.responsavel_id:
            await self.repo.criar_planejamento_execucao(
                ciclo_id=dados.ciclo_id,
                caso_id=novo_caso.id,
                responsavel_id=dados.responsavel_id
            )
            
        return novo_caso
    
    async def atualizar_caso(self, caso_id: int, dados: CasoTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)
        return await self.repo.update_caso_teste(caso_id, update_data)

    async def remover_caso(self, caso_id: int):
        return await self.repo.delete_caso_teste(caso_id)

    async def criar_ciclo(self, projeto_id: int, dados: CicloTesteCreate):
        return await self.repo.create_ciclo(projeto_id, dados)
    
    async def atualizar_ciclo(self, ciclo_id: int, dados: CicloTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)
        return await self.repo.update_ciclo(ciclo_id, update_data)

    async def remover_ciclo(self, ciclo_id: int):
        return await self.repo.delete_ciclo(ciclo_id)

    # --- EXECUÇÃO DE TESTES ---

    async def alocar_teste_para_execucao(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        """
        Prepara uma execução: cria o registro principal e copia os passos do template.
        """
        # Validação simples: verificar se o caso já não está alocado para este ciclo (opcional)
        # existente = await self.repo.check_execucao_existente(ciclo_id, caso_id)
        # if existente: raise HTTPException(...)

        return await self.repo.criar_planejamento_execucao(ciclo_id, caso_id, responsavel_id)

    async def listar_tarefas_usuario(self, usuario_id: int):
        """Lista execuções pendentes atribuídas ao usuário."""
        return await self.repo.get_minhas_execucoes(usuario_id)

    async def registrar_resultado_passo(self, execucao_passo_id: int, dados: ExecucaoPassoUpdate):
        """
        Atualiza um passo específico.
        Regra Automática: Se o passo falhar, marca a execução inteira como FALHOU.
        """
        passo_atualizado = await self.repo.update_execucao_passo(execucao_passo_id, dados)
        
        if not passo_atualizado:
            raise HTTPException(status_code=404, detail="Passo de execução não encontrado")

        # Automação de Status
        if dados.status == StatusPassoEnum.reprovado:
            # Se um passo falha, o teste todo falha imediatamente
            await self.repo.update_status_geral_execucao(
                passo_atualizado.execucao_teste_id, 
                StatusExecucaoEnum.falhou
            )
        elif dados.status == StatusPassoEnum.bloqueado:
            # Se um passo está bloqueado, o teste todo fica bloqueado
            await self.repo.update_status_geral_execucao(
                passo_atualizado.execucao_teste_id, 
                StatusExecucaoEnum.bloqueado
            )
            
        return passo_atualizado

    async def finalizar_execucao(self, execucao_id: int, status: StatusExecucaoEnum):
        """Permite finalizar manualmente o teste inteiro (ex: marcar como Passou)."""
        return await self.repo.update_status_geral_execucao(execucao_id, status)