from typing import Sequence, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime

from app.repositories.ciclo_teste_repository import CicloTesteRepository
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteUpdate, CicloTesteResponse
from app.models.testing import CicloTeste 
from app.core.errors import tratar_erro_integridade

class CicloTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = CicloTesteRepository(db)

    async def get_all_ciclos(self) -> Sequence[CicloTesteResponse]:
        ciclos = await self.repo.get_all()
        return [CicloTesteResponse.model_validate(c) for c in ciclos]
    
    async def obter_ciclo(self, ciclo_id: int) -> Optional[CicloTeste]:
        return await self.repo.get_by_id(ciclo_id)

    async def criar_ciclo(self, projeto_id: int, dados: CicloTesteCreate):
        existente = await self.repo.get_by_nome_projeto(dados.nome, projeto_id)
        if existente:
             raise HTTPException(status_code=400, detail="Já existe um Ciclo com este nome neste projeto.")
        
        if dados.data_inicio:
            hoje = datetime.now().date()
            data_inicio_check = dados.data_inicio
            if isinstance(data_inicio_check, datetime):
                data_inicio_check = data_inicio_check.date()
                
            if data_inicio_check < hoje:
                raise HTTPException(status_code=400, detail="A data de início do ciclo não pode ser no passado.")
        
        try:
            novo_ciclo = await self.repo.create(projeto_id, dados)
            return CicloTesteResponse.model_validate(novo_ciclo)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)

    async def atualizar_ciclo(self, ciclo_id: int, dados: CicloTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)
        try:
            ciclo = await self.repo.update(ciclo_id, update_data)
            if ciclo:
                return CicloTesteResponse.model_validate(ciclo)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)

    async def listar_por_projeto(self, projeto_id: int):
        items = await self.repo.list_by_projeto(projeto_id)
        return [CicloTesteResponse.model_validate(i) for i in items]

    async def remover_ciclo(self, ciclo_id: int):
        try:
            return await self.repo.delete(ciclo_id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "foreign key": "Não é possível excluir este Ciclo pois ele possui execuções vinculadas."
            })