from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update, delete
from typing import Sequence, Optional

from app.models.testing import Defeito, ExecucaoTeste, CasoTeste, ExecucaoPasso
from app.models.usuario import Usuario
from app.schemas.defeito import DefeitoCreate

class DefeitoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, dados: DefeitoCreate) -> Defeito:
        db_obj = Defeito(**dados.model_dump())
        self.db.add(db_obj)
        await self.db.commit()
        
        return await self.get_by_id_full(db_obj.id)

    async def get_by_id(self, id: int) -> Optional[Defeito]:
        query = select(Defeito).where(Defeito.id == id)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_by_id_full(self, id: int) -> Optional[Defeito]:
        query = (
            select(Defeito)
            .options(
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
            )
            .where(Defeito.id == id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_execucao(self, execucao_id: int) -> Sequence[Defeito]:
        query = select(Defeito).where(Defeito.execucao_teste_id == execucao_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, id: int, dados: dict) -> Optional[Defeito]:
        query = (
            update(Defeito)
            .where(Defeito.id == id)
            .values(**dados)
            .returning(Defeito.id) 
        )
        result = await self.db.execute(query)
        await self.db.commit()
        
        updated_id = result.scalars().first()
        if updated_id:
             return await self.get_by_id_full(updated_id)
        return None
    
    async def delete(self, id: int) -> bool:
        query = delete(Defeito).where(Defeito.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0