from typing import Sequence, Optional, List
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, aliased
from sqlalchemy import desc

from app.models.testing import Defeito, ExecucaoTeste, CasoTeste, ExecucaoPasso
from app.models.projeto import Projeto
from app.models.usuario import Usuario
from app.schemas.defeito import DefeitoCreate, DefeitoUpdate

class DefeitoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_load_options(self):
        return [
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.projeto),
                selectinload(CasoTeste.ciclo)
            ),
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.ciclo),
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
        ]

    async def create(self, dados: DefeitoCreate) -> Defeito:
        # Prepara dados e converte lista de evidências para string JSON
        dados_dict = dados.model_dump()
        if dados_dict.get('evidencias'):
            dados_dict['evidencias'] = json.dumps(dados_dict['evidencias'])
        else:
            dados_dict['evidencias'] = json.dumps([])

        # 1. Blindagem: Evita duplicidade
        query_existente = (
            select(Defeito)
            .options(*self._get_load_options()) 
            .where(
                Defeito.execucao_teste_id == dados.execucao_teste_id,
                Defeito.titulo == dados.titulo,
                Defeito.status != 'fechado'
            )
        )
        
        result = await self.db.execute(query_existente)
        defeito_existente = result.scalars().first()

        if defeito_existente:
            return defeito_existente

        # 2. Criação
        novo_defeito = Defeito(**dados_dict)
        self.db.add(novo_defeito)
        await self.db.commit()
        
        # 3. Recarrega
        query_novo = (
            select(Defeito)
            .options(*self._get_load_options()) 
            .where(Defeito.id == novo_defeito.id)
        )
        result = await self.db.execute(query_novo)
        return result.scalars().first()

    async def get_all_with_details(self, responsavel_id: Optional[int] = None):
        Runner = aliased(Usuario)  
        Manager = aliased(Usuario) 

        query = (
            select(
                Defeito.id,
                Defeito.titulo,
                Defeito.descricao,
                Defeito.status,
                Defeito.severidade,
                Defeito.created_at,
                Defeito.evidencias,
                Defeito.logs_erro,
                Defeito.execucao_teste_id,
                CasoTeste.nome.label('caso_teste_nome'),
                Projeto.nome.label('projeto_nome'),
                Runner.nome.label('responsavel_teste_nome'),   
                Manager.nome.label('responsavel_projeto_nome') 
            )
            .join(ExecucaoTeste, Defeito.execucao_teste_id == ExecucaoTeste.id)
            .join(CasoTeste, ExecucaoTeste.caso_teste_id == CasoTeste.id)
            .join(Projeto, CasoTeste.projeto_id == Projeto.id)
            .outerjoin(Runner, ExecucaoTeste.responsavel_id == Runner.id)
            .outerjoin(Manager, Projeto.responsavel_id == Manager.id)
            .order_by(desc(Defeito.id))
        )

        if responsavel_id:
            query = query.where(ExecucaoTeste.responsavel_id == responsavel_id)

        result = await self.db.execute(query)
        return result.mappings().all()

    async def get_by_id(self, id: int) -> Optional[Defeito]:
        query = (
            select(Defeito)
            .options(*self._get_load_options())
            .where(Defeito.id == id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update(self, id: int, dados: DefeitoUpdate) -> Optional[Defeito]:
        defeito = await self.get_by_id(id)
        if not defeito:
            return None
            
        update_data = dados.model_dump(exclude_unset=True)
        
        # Converte lista para JSON String se houver evidências na atualização
        if 'evidencias' in update_data and isinstance(update_data['evidencias'], list):
             update_data['evidencias'] = json.dumps(update_data['evidencias'])

        for key, value in update_data.items():
            setattr(defeito, key, value)
            
        await self.db.commit()
        return await self.get_by_id(id)

    async def delete(self, id: int) -> bool:
        defeito = await self.db.get(Defeito, id)
        if defeito:
            await self.db.delete(defeito)
            await self.db.commit()
            return True
        return False