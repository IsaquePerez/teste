from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update as sqlalchemy_update, desc, and_
from typing import Sequence, Optional

from app.models.testing import CasoTeste, PassoCasoTeste, ExecucaoTeste, StatusExecucaoEnum, ExecucaoPasso, Defeito
from app.models.usuario import Usuario
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteUpdate

class CasoTesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_nome_projeto(self, nome: str, projeto_id: int) -> Optional[CasoTeste]:
        query = select(CasoTeste).where(CasoTeste.nome == nome, CasoTeste.projeto_id == projeto_id)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_all(self) -> Sequence[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(CasoTeste.ciclo),
                selectinload(CasoTeste.projeto)
            )
            .order_by(CasoTeste.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_all_by_projeto(self, projeto_id: int) -> Sequence[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(CasoTeste.ciclo),
                selectinload(CasoTeste.projeto)
            )
            .where(CasoTeste.projeto_id == projeto_id)
            .order_by(CasoTeste.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, caso_id: int) -> Optional[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(CasoTeste.ciclo),
                selectinload(CasoTeste.projeto)
            )
            .where(CasoTeste.id == caso_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, projeto_id: int, caso_data: CasoTesteCreate) -> CasoTeste:
        db_caso = CasoTeste(
            projeto_id=projeto_id,
            **caso_data.model_dump(exclude={'passos'}) 
        )
        self.db.add(db_caso)
        await self.db.flush() 

        passos_objs = []
        if caso_data.passos:
            passos_objs = [
                PassoCasoTeste(caso_teste_id=db_caso.id, **p.model_dump()) 
                for p in caso_data.passos
            ]
            self.db.add_all(passos_objs)
            await self.db.flush()
        
        if caso_data.ciclo_id and caso_data.responsavel_id:
            nova_execucao = ExecucaoTeste(
                ciclo_teste_id=caso_data.ciclo_id,
                caso_teste_id=db_caso.id,
                responsavel_id=caso_data.responsavel_id,
                status_geral=StatusExecucaoEnum.pendente
            )
            self.db.add(nova_execucao)
            await self.db.flush() 

            if passos_objs:
                passos_execucao = [
                    ExecucaoPasso(
                        execucao_teste_id=nova_execucao.id,
                        passo_caso_teste_id=p.id,
                        status="pendente",
                        resultado_obtido=""
                    )
                    for p in passos_objs
                ]
                self.db.add_all(passos_execucao)

        await self.db.commit()
        return await self.get_by_id(db_caso.id)

    async def update(self, caso_id: int, dados: CasoTesteUpdate) -> Optional[CasoTeste]:
        dados_dict = dados.model_dump(exclude_unset=True)
        passos_data = dados_dict.pop('passos', None)

        if dados_dict:
            await self.db.execute(
                sqlalchemy_update(CasoTeste).where(CasoTeste.id == caso_id).values(**dados_dict)
            )

        current_passos_ids = []
        
        if passos_data is not None:
            query_atuais = select(PassoCasoTeste.id).where(PassoCasoTeste.caso_teste_id == caso_id)
            ids_no_banco = (await self.db.execute(query_atuais)).scalars().all()
            
            incoming_ids = [p['id'] for p in passos_data if 'id' in p and p['id']]
            ids_para_deletar = [id_ for id_ in ids_no_banco if id_ not in incoming_ids]

            if ids_para_deletar:
                await self.db.execute(delete(ExecucaoPasso).where(ExecucaoPasso.passo_caso_teste_id.in_(ids_para_deletar)))
                await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.id.in_(ids_para_deletar)))

            for passo in passos_data:
                if 'id' in passo and passo['id']:
                    await self.db.execute(
                        sqlalchemy_update(PassoCasoTeste)
                        .where(PassoCasoTeste.id == passo['id'])
                        .values(acao=passo['acao'], resultado_esperado=passo['resultado_esperado'], ordem=passo['ordem'])
                    )
                    current_passos_ids.append(passo['id'])
                else:
                    novo_passo = PassoCasoTeste(
                        caso_teste_id=caso_id,
                        acao=passo['acao'],
                        resultado_esperado=passo['resultado_esperado'],
                        ordem=passo['ordem']
                    )
                    self.db.add(novo_passo)
                    await self.db.flush()
                    current_passos_ids.append(novo_passo.id)

        query_exec = select(ExecucaoTeste).where(
            ExecucaoTeste.caso_teste_id == caso_id,
            ExecucaoTeste.status_geral == StatusExecucaoEnum.pendente
        )
        exec_result = await self.db.execute(query_exec)
        execucao_ativa = exec_result.scalars().first()

        if execucao_ativa:
            has_changes = False
            if 'responsavel_id' in dados_dict and execucao_ativa.responsavel_id != dados_dict['responsavel_id']:
                execucao_ativa.responsavel_id = dados_dict['responsavel_id']
                has_changes = True
            
            if 'ciclo_id' in dados_dict and execucao_ativa.ciclo_teste_id != dados_dict['ciclo_id']:
                if dados_dict['ciclo_id']:
                    execucao_ativa.ciclo_teste_id = dados_dict['ciclo_id']
                    has_changes = True
            
            if has_changes:
                self.db.add(execucao_ativa)

            if passos_data is not None:
                await self.db.execute(
                    delete(ExecucaoPasso)
                    .where(ExecucaoPasso.execucao_teste_id == execucao_ativa.id)
                    .where(ExecucaoPasso.passo_caso_teste_id.notin_(current_passos_ids))
                )
                subquery_existentes = select(ExecucaoPasso.passo_caso_teste_id).where(ExecucaoPasso.execucao_teste_id == execucao_ativa.id)
                
                query_passos_faltantes = select(PassoCasoTeste).where(
                    PassoCasoTeste.caso_teste_id == caso_id,
                    PassoCasoTeste.id.in_(current_passos_ids),
                    PassoCasoTeste.id.notin_(subquery_existentes)
                )
                passos_novos = (await self.db.execute(query_passos_faltantes)).scalars().all()

                for pn in passos_novos:
                    self.db.add(ExecucaoPasso(
                        execucao_teste_id=execucao_ativa.id,
                        passo_caso_teste_id=pn.id,
                        status="pendente",
                        resultado_obtido=""
                    ))

        await self.db.commit()
        return await self.get_by_id(caso_id)

    async def delete(self, caso_id: int) -> bool:
        execs = await self.db.execute(select(ExecucaoTeste.id).where(ExecucaoTeste.caso_teste_id == caso_id))
        execs_ids = execs.scalars().all()

        if execs_ids:
            await self.db.execute(delete(ExecucaoPasso).where(ExecucaoPasso.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(Defeito).where(Defeito.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(ExecucaoTeste).where(ExecucaoTeste.id.in_(execs_ids)))

        await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.caso_teste_id == caso_id))
        result = await self.db.execute(delete(CasoTeste).where(CasoTeste.id == caso_id))
        await self.db.commit()
        return result.rowcount > 0