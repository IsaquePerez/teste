from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.repositories.caso_teste_repository import CasoTesteRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.projeto_repository import ProjetoRepository
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteResponse, CasoTesteUpdate

class CasoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = CasoTesteRepository(db)
        self.user_repo = UsuarioRepository(db)
        self.projeto_repo = ProjetoRepository(db)

    async def _validar_usuario_ativo(self, usuario_id: int):
        # CORREÇÃO CRÍTICA: get_by_id (não get_usuario_by_id)
        user = await self.user_repo.get_by_id(usuario_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {usuario_id} não encontrado."
            )
        if not user.ativo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Usuário {usuario_id} está inativo."
            )

    async def criar_caso_teste(self, projeto_id: int, dados: CasoTesteCreate) -> CasoTesteResponse:
        projeto = await self.projeto_repo.get_by_id(projeto_id)
        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        if dados.responsavel_id:
            await self._validar_usuario_ativo(dados.responsavel_id)
        
        novo_caso = await self.repo.create(projeto_id, dados)
        return CasoTesteResponse.model_validate(novo_caso)

    async def listar_casos_teste(self, projeto_id: int) -> List[CasoTesteResponse]:
        # O repositório AGORA tem esse método
        casos = await self.repo.get_all_by_projeto(projeto_id)
        return [CasoTesteResponse.model_validate(c) for c in casos]

    async def obter_caso_teste(self, caso_id: int) -> CasoTesteResponse:
        caso = await self.repo.get_by_id(caso_id)
        if not caso:
            raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")
        return CasoTesteResponse.model_validate(caso)

    async def atualizar_caso_teste(self, caso_id: int, dados: CasoTesteUpdate) -> CasoTesteResponse:
        caso = await self.repo.get_by_id(caso_id)
        if not caso:
            raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")
            
        if dados.responsavel_id:
            await self._validar_usuario_ativo(dados.responsavel_id)
            
        caso_atualizado = await self.repo.update(caso_id, dados)
        return CasoTesteResponse.model_validate(caso_atualizado)

    async def deletar_caso_teste(self, caso_id: int):
        caso = await self.repo.get_by_id(caso_id)
        if not caso:
            raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")
        await self.repo.delete(caso_id)