from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import Sequence, Optional
from app.models.projeto import Projeto

class ProjetoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, projeto: Projeto) -> Projeto:
        self.db.add(projeto)
        await self.db.commit()
        await self.db.refresh(projeto)
        return projeto
    
    async def get_all(self) -> Sequence[Projeto]:
        query = select(Projeto)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_by_id(self, id: int) -> Optional[Projeto]:
        query = select(Projeto).where(Projeto.id == id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_nome(self, nome: str) -> Optional[Projeto]:
        query = select(Projeto).where(Projeto.nome == nome)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def update(self, id: int, update_data: dict) -> Optional[Projeto]:
        query = (
            update(Projeto)
            .where(Projeto.id == id)
            .values(**update_data)
            .returning(Projeto)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.scalars().first()

    async def delete(self, id: int) -> bool:
        query = delete(Projeto).where(Projeto.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0