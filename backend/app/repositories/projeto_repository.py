from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, or_
from typing import Sequence, Optional
from app.models.projeto import Projeto
# NOVAS IMPORTAÇÕES PARA O CASCADE DELETE
from app.models.testing import (
    CicloTeste, CasoTeste, PassoCasoTeste, 
    ExecucaoTeste, ExecucaoPasso, 
    Defeito
)

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
        # --- INÍCIO DO CASCADE DELETE MANUAL (PROJETO) ---
        
        # 1. Encontrar todos os Casos e Ciclos de Teste vinculados
        query_casos = select(CasoTeste.id).where(CasoTeste.projeto_id == id)
        result_casos = await self.db.execute(query_casos)
        casos_ids = result_casos.scalars().all()

        query_ciclos = select(CicloTeste.id).where(CicloTeste.projeto_id == id)
        result_ciclos = await self.db.execute(query_ciclos)
        ciclos_ids = result_ciclos.scalars().all()

        # 2. Encontrar todas as Execuções (ExecucaoTeste) vinculadas a esses Casos OU Ciclos
        # É necessário buscar execuções vinculadas tanto ao caso quanto ao ciclo
        query_execs = select(ExecucaoTeste.id).where(
            or_(
                ExecucaoTeste.caso_teste_id.in_(casos_ids) if casos_ids else False,
                ExecucaoTeste.ciclo_teste_id.in_(ciclos_ids) if ciclos_ids else False
            )
        )
        result_execs = await self.db.execute(query_execs)
        execs_ids = result_execs.scalars().all()
        
        # 3. Apagar entidades de nível mais baixo (Netos: Passos Executados e Defeitos)
        if execs_ids:
            # Apaga passos executados
            await self.db.execute(delete(ExecucaoPasso).where(ExecucaoPasso.execucao_teste_id.in_(execs_ids)))
            # Apaga defeitos
            await self.db.execute(delete(Defeito).where(Defeito.execucao_teste_id.in_(execs_ids)))
            # Apaga as execuções em si
            await self.db.execute(delete(ExecucaoTeste).where(ExecucaoTeste.id.in_(execs_ids)))

        # 4. Apagar entidades de nível intermediário (Filhos: Casos e Ciclos)
        if casos_ids:
            # Apaga os passos template dos Casos de Teste
            await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.caso_teste_id.in_(casos_ids)))
            # Apaga os Casos de Teste
            await self.db.execute(delete(CasoTeste).where(CasoTeste.id.in_(casos_ids)))

        if ciclos_ids:
            # Apaga os Ciclos de Teste
            await self.db.execute(delete(CicloTeste).where(CicloTeste.id.in_(ciclos_ids)))
            
        # Nota: Modulos são ligados a Sistemas, não diretamente a Projetos (baseado no README), então não são apagados aqui.

        # 5. Finalmente, apagar o Projeto (Pai)
        query = delete(Projeto).where(Projeto.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        
        # --- FIM DO CASCADE DELETE MANUAL ---
        return result.rowcount > 0