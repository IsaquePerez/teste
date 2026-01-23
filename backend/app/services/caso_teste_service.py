import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.repositories.caso_teste_repository import CasoTesteRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteUpdate, CasoTesteResponse
from app.core.errors import tratar_erro_integridade

logger = logging.getLogger(__name__)

class CasoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = CasoTesteRepository(db)
        self.user_repo = UsuarioRepository(db)

    async def _validar_usuario_ativo(self, usuario_id: int):
        if not usuario_id: return
        user = await self.user_repo.get_usuario_by_id(usuario_id)
        if not user or not user.ativo:
            raise HTTPException(status_code=400, detail="O utilizador selecionado está INATIVO.")

    async def criar_caso_teste(self, projeto_id: int, dados: CasoTesteCreate):
        existente = await self.repo.get_by_nome_projeto(dados.nome, projeto_id)
        if existente:
             raise HTTPException(status_code=400, detail="Já existe um Caso de Teste com este nome neste projeto.")

        if dados.responsavel_id:
            await self._validar_usuario_ativo(dados.responsavel_id)

        try:
            novo_caso = await self.repo.create(projeto_id, dados)
            return novo_caso
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)
        except Exception as e:
            await self.repo.db.rollback()
            logger.error(f"Erro ao criar caso: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao criar caso de teste.")

    async def atualizar_caso(self, caso_id: int, dados: CasoTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)
        
        if 'responsavel_id' in update_data and update_data['responsavel_id']:
             await self._validar_usuario_ativo(update_data['responsavel_id'])
        
        try:
            return await self.repo.update(caso_id, update_data)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)
    
    async def listar_por_projeto(self, projeto_id: int):
        items = await self.repo.get_by_projeto(projeto_id)
        return [CasoTesteResponse.model_validate(i) for i in items]

    async def remover_caso(self, caso_id: int):
        try:
            return await self.repo.delete(caso_id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "foreign key": "Não é possível excluir este Caso pois ele possui execuções vinculadas."
            })