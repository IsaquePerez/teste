from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import Sequence, Optional

from app.models.testing import Defeito
from app.schemas.defeito import DefeitoCreate

class DefeitoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, dados: DefeitoCreate) -> Defeito:
        db_obj = Defeito(**dados.model_dump())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_by_id(self, id: int) -> Optional[Defeito]:
        query = select(Defeito).where(Defeito.id == id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_execucao(self, execucao_id: int) -> Sequence[Defeito]:
        """Lista defeitos vinculados a uma execução específica"""
        query = select(Defeito).where(Defeito.execucao_teste_id == execucao_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, id: int, dados: dict) -> Optional[Defeito]:
        query = (
            update(Defeito)
            .where(Defeito.id == id)
            .values(**dados)
            .returning(Defeito)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.scalars().first()
    
    async def delete(self, id: int) -> bool:
        query = delete(Defeito).where(Defeito.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0