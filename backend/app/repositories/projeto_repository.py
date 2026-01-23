from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, or_
from typing import Sequence, Optional
from app.models.projeto import Projeto
from app.models.testing import (
    CicloTeste, CasoTeste, PassoCasoTeste, 
    ExecucaoTeste, ExecucaoPasso, 
    Defeito
)

class ProjetoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, projeto_data: Projeto) -> Projeto:
        db_projeto = Projeto(**projeto_data.model_dump())
        
        self.db.add(db_projeto)
        await self.db.commit()
        await self.db.refresh(db_projeto)
        return db_projeto
    
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
        
        query_casos = select(CasoTeste.id).where(CasoTeste.projeto_id == id)
        result_casos = await self.db.execute(query_casos)
        casos_ids = result_casos.scalars().all()

        query_ciclos = select(CicloTeste.id).where(CicloTeste.projeto_id == id)
        result_ciclos = await self.db.execute(query_ciclos)
        ciclos_ids = result_ciclos.scalars().all()

        query_execs = select(ExecucaoTeste.id).where(
            or_(
                ExecucaoTeste.caso_teste_id.in_(casos_ids) if casos_ids else False,
                ExecucaoTeste.ciclo_teste_id.in_(ciclos_ids) if ciclos_ids else False
            )
        )
        result_execs = await self.db.execute(query_execs)
        execs_ids = result_execs.scalars().all()
        
        if execs_ids:
            await self.db.execute(delete(ExecucaoPasso).where(ExecucaoPasso.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(Defeito).where(Defeito.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(ExecucaoTeste).where(ExecucaoTeste.id.in_(execs_ids)))

        if casos_ids:
            await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.caso_teste_id.in_(casos_ids)))
            await self.db.execute(delete(CasoTeste).where(CasoTeste.id.in_(casos_ids)))

        if ciclos_ids:
            await self.db.execute(delete(CicloTeste).where(CicloTeste.id.in_(ciclos_ids)))
            
        query = delete(Projeto).where(Projeto.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        
        return result.rowcount > 0