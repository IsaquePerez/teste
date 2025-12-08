from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional, List
from fastapi import HTTPException

from app.models.projeto import Projeto
from app.repositories.projeto_repository import ProjetoRepository
# 1. IMPORTANTE: Importar o repositório de usuários
from app.repositories.usuario_repository import UsuarioRepository 
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse

class ProjetoService:
    def __init__(self, db: AsyncSession):
        self.repo = ProjetoRepository(db)
        # 2. IMPORTANTE: Inicializar o repositório aqui!
        # Sem esta linha, o erro 'no attribute user_repo' acontece.
        self.user_repo = UsuarioRepository(db)

    # --- MÉTODO AUXILIAR DE VALIDAÇÃO ---
    async def _validar_responsavel(self, usuario_id: Optional[int]):
        if usuario_id:
            user = await self.user_repo.get_usuario_by_id(usuario_id)
            if not user:
                raise HTTPException(status_code=400, detail="Responsável não encontrado.")
            if not user.ativo:
                raise HTTPException(status_code=400, detail="Não é possível atribuir um utilizador INATIVO como responsável.")

    async def create(self, data: ProjetoCreate) -> ProjetoResponse:
        await self._validar_responsavel(data.responsavel_id)
        existente = await self.repo.get_by_nome(data.nome)
        if existente:
            raise HTTPException(status_code=400, detail="Já existe um Projeto com este nome.")
        
        db_obj = Projeto(**data.model_dump())        
        created = await self.repo.create(db_obj)
        return ProjetoResponse.model_validate(created)

    async def get_all(self) -> List[ProjetoResponse]:
        items = await self.repo.get_all()
        return [ProjetoResponse.model_validate(i) for i in items]

    async def get_by_id(self, id: int) -> Optional[ProjetoResponse]:
        item = await self.repo.get_by_id(id)
        if item:
            return ProjetoResponse.model_validate(item)
        return None

    async def update(self, id: int, data: ProjetoUpdate) -> Optional[ProjetoResponse]:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
             raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
        
        # Valida também na atualização
        if 'responsavel_id' in update_data:
             await self._validar_responsavel(update_data['responsavel_id'])
             
        updated = await self.repo.update(id, update_data)
        if updated:
            return ProjetoResponse.model_validate(updated)
        return None

    async def delete(self, id: int) -> bool:
        return await self.repo.delete(id)