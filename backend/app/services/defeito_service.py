from typing import List, Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.usuario import Usuario
from app.models.testing import StatusExecucaoEnum, StatusDefeitoEnum 
from app.repositories.defeito_repository import DefeitoRepository
# Importa o repositório de execução para fazer a ponte
from app.repositories.execucao_teste_repository import ExecucaoTesteRepository 
from app.schemas.defeito import DefeitoCreate, DefeitoUpdate, DefeitoResponse

class DefeitoService:
    def __init__(self, db: AsyncSession):
        self.repo = DefeitoRepository(db)
        # Inicializa repositório de execução
        self.execucao_repo = ExecucaoTesteRepository(db)

    # Mantido HEAD: Simples e direto, compatível com seu Controller atual
    async def registrar_defeito(self, dados: DefeitoCreate):
        return await self.repo.create(dados)

    # Mantido HEAD: Crucial usar 'get_all_with_details' para popular a tabela do front
    async def listar_todos(self, current_user: Usuario, filtro_responsavel_id: Optional[int] = None):
        return await self.repo.get_all_with_details(responsavel_id=filtro_responsavel_id)

    async def atualizar_defeito(self, id: int, dados: DefeitoUpdate):
        # 1. Atualiza o defeito
        defeito_atualizado = await self.repo.update(id, dados)
        
        if not defeito_atualizado:
            return None

        # 2. SINCRONIA CRÍTICA: Se o bug foi marcado como CORRIGIDO, coloca a execução em RETESTE
        if dados.status == StatusDefeitoEnum.corrigido:
            await self.execucao_repo.update_status(
                defeito_atualizado.execucao_teste_id, 
                StatusExecucaoEnum.reteste
            )
        
        return defeito_atualizado

    async def excluir_defeito(self, id: int):
        return await self.repo.delete(id)