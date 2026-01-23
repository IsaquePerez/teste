from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update as sqlalchemy_update
from typing import Sequence, Optional

from app.models.testing import CicloTeste, ExecucaoTeste
from app.models.usuario import Usuario
from app.schemas.ciclo_teste import CicloTesteCreate

class CicloTesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_nome_projeto(self, nome: str, projeto_id: int) -> Optional[CicloTeste]:
        query = select(CicloTeste).where(CicloTeste.nome == nome, CicloTeste.projeto_id == projeto_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_by_projeto(self, projeto_id: int) -> Sequence[CicloTeste]:
        query = (
            select(CicloTeste)
            .options(
                selectinload(CicloTeste.execucoes).selectinload(ExecucaoTeste.responsavel)
            )
            .where(CicloTeste.projeto_id == projeto_id)
            .order_by(CicloTeste.data_inicio.desc())
        )
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def create(self, projeto_id: int, ciclo_data: CicloTesteCreate) -> CicloTeste:
        dados_ciclo = ciclo_data.model_dump(exclude={'projeto_id'})        
        db_ciclo = CicloTeste(projeto_id=projeto_id, **dados_ciclo)        
        self.db.add(db_ciclo)
        await self.db.commit()
        return await self.get_by_id(db_ciclo.id)

    async def get_by_id(self, ciclo_id: int) -> Optional[CicloTeste]:
        query = (
            select(CicloTeste)
            .options(selectinload(CicloTeste.execucoes).selectinload(ExecucaoTeste.responsavel))
            .where(CicloTeste.id == ciclo_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update(self, ciclo_id: int, dados: dict) -> Optional[CicloTeste]:
        if not dados:
             return await self.get_by_id(ciclo_id)
             
        await self.db.execute(
            sqlalchemy_update(CicloTeste).where(CicloTeste.id == ciclo_id).values(**dados)
        )
        await self.db.commit()
        return await self.get_by_id(ciclo_id)

    async def delete(self, ciclo_id: int) -> bool:
        result = await self.db.execute(delete(CicloTeste).where(CicloTeste.id == ciclo_id))
        await self.db.commit()
        return result.rowcount > 0