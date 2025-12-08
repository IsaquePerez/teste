# backend/app/repositories/teste_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional
from sqlalchemy import func, delete, update as sqlalchemy_update

from app.models.testing import (
    CicloTeste, CasoTeste, PassoCasoTeste, 
    ExecucaoTeste, ExecucaoPasso, 
    StatusExecucaoEnum
)
from app.models.usuario import Usuario 

from app.schemas.caso_teste import CasoTesteCreate
from app.schemas.ciclo_teste import CicloTesteCreate
from app.schemas.execucao_teste import ExecucaoPassoUpdate

class TesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- CASOS DE TESTE ---

    async def get_caso_by_nome_projeto(self, nome: str, projeto_id: int) -> Optional[CasoTeste]:
        query = select(CasoTeste).where(
            CasoTeste.nome == nome, 
            CasoTeste.projeto_id == projeto_id
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create_caso_teste(self, projeto_id: int, caso_data: CasoTesteCreate) -> CasoTeste:
        db_caso = CasoTeste(
            projeto_id=projeto_id,
            nome=caso_data.nome,
            descricao=caso_data.descricao,
            pre_condicoes=caso_data.pre_condicoes,
            criterios_aceitacao=caso_data.criterios_aceitacao,
            prioridade=caso_data.prioridade,
            responsavel_id=caso_data.responsavel_id
        )
        self.db.add(db_caso)
        await self.db.flush() 

        if caso_data.passos:
            passos_objetos = [
                PassoCasoTeste(
                    caso_teste_id=db_caso.id,
                    ordem=passo.ordem,
                    acao=passo.acao,
                    resultado_esperado=passo.resultado_esperado
                ) for passo in caso_data.passos
            ]
            self.db.add_all(passos_objetos)
        
        await self.db.commit()
        return await self.get_caso_teste_by_id(db_caso.id)

    async def get_caso_teste_by_id(self, caso_id: int) -> Optional[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(CasoTeste.id == caso_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_casos_by_projeto(self, projeto_id: int, skip: int = 0, limit: int = 100) -> Sequence[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(CasoTeste.projeto_id == projeto_id)
            .offset(skip)
            .limit(limit)
            .order_by(CasoTeste.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_caso_teste(self, caso_id: int, dados: dict) -> Optional[CasoTeste]:
        passos_data = dados.pop('passos', None)

        query = (
            sqlalchemy_update(CasoTeste)
            .where(CasoTeste.id == caso_id)
            .values(**dados)
            .returning(CasoTeste.id)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        
        updated_id = result.scalars().first()
        
        # 3. Processa os passos (Adicionar ou Editar)
        if updated_id and passos_data is not None:
            for passo in passos_data:
                if 'id' in passo and passo['id']:
                    await self.db.execute(
                        sqlalchemy_update(PassoCasoTeste)
                        .where(PassoCasoTeste.id == passo['id'])
                        .values(
                            acao=passo['acao'], 
                            resultado_esperado=passo['resultado_esperado'],
                            ordem=passo['ordem']
                        )
                    )
                else:
                    novo_passo = PassoCasoTeste(
                        caso_teste_id=caso_id,
                        acao=passo['acao'],
                        resultado_esperado=passo['resultado_esperado'],
                        ordem=passo['ordem']
                    )
                    self.db.add(novo_passo)
            
            await self.db.commit()

        if updated_id:
             return await self.get_caso_teste_by_id(updated_id)
        return None

    async def delete_caso_teste(self, caso_id: int) -> bool:
        query = delete(CasoTeste).where(CasoTeste.id == caso_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    # --- CICLOS DE TESTE (CORREÇÕES AQUI) ---

    async def get_ciclo_by_nome_projeto(self, nome: str, projeto_id: int) -> Optional[CicloTeste]:
        query = select(CicloTeste).where(
            CicloTeste.nome == nome, 
            CicloTeste.projeto_id == projeto_id
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create_ciclo(self, projeto_id: int, ciclo_data: CicloTesteCreate) -> CicloTeste:
        dados_ciclo = ciclo_data.model_dump(exclude={'projeto_id'})
        db_ciclo = CicloTeste(projeto_id=projeto_id, **dados_ciclo)
        
        self.db.add(db_ciclo)
        await self.db.commit()
        
        # NÃO use refresh() nem atribuição manual aqui.
        # Faça uma query completa para retornar o objeto com as relações carregadas.
        query = (
            select(CicloTeste)
            .options(
                selectinload(CicloTeste.execucoes).selectinload(ExecucaoTeste.responsavel)
            )
            .where(CicloTeste.id == db_ciclo.id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_ciclos_by_projeto(self, projeto_id: int, skip: int = 0, limit: int = 50) -> Sequence[CicloTeste]:
        query = (
            select(CicloTeste)
            .options(
                # Traz as execuções e seus responsáveis para popular "Equipe" e "Progresso"
                selectinload(CicloTeste.execucoes).selectinload(ExecucaoTeste.responsavel)
            )
            .where(CicloTeste.projeto_id == projeto_id)
            .offset(skip)
            .limit(limit)
            .order_by(CicloTeste.data_inicio.desc())
        )
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def update_ciclo(self, ciclo_id: int, dados: dict) -> Optional[CicloTeste]:
        # 1. Update
        query = (
            sqlalchemy_update(CicloTeste)
            .where(CicloTeste.id == ciclo_id)
            .values(**dados)
        )
        await self.db.execute(query)
        await self.db.commit()
        
        # 2. Re-select com carregamento (para não quebrar a resposta)
        query_get = (
            select(CicloTeste)
            .options(selectinload(CicloTeste.execucoes).selectinload(ExecucaoTeste.responsavel))
            .where(CicloTeste.id == ciclo_id)
        )
        result = await self.db.execute(query_get)
        return result.scalars().first()

    async def delete_ciclo(self, ciclo_id: int) -> bool:
        query = delete(CicloTeste).where(CicloTeste.id == ciclo_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    # --- EXECUÇÃO ---
    
    async def verificar_pendencias_ciclo(self, ciclo_id: int) -> bool:
        """Verifica se ainda há testes não finalizados no ciclo"""
        query = select(ExecucaoTeste).where(
            ExecucaoTeste.ciclo_teste_id == ciclo_id,
            ExecucaoTeste.status_geral.in_([
                StatusExecucaoEnum.pendente, 
                StatusExecucaoEnum.em_progresso
            ])
        )
        result = await self.db.execute(query)
        return result.scalars().first() is not None

    async def criar_planejamento_execucao(self, ciclo_id: int, caso_id: int, responsavel_id: int) -> ExecucaoTeste:
        nova_execucao = ExecucaoTeste(
            ciclo_teste_id=ciclo_id,
            caso_teste_id=caso_id,
            responsavel_id=responsavel_id,
            status_geral=StatusExecucaoEnum.pendente
        )
        self.db.add(nova_execucao)
        await self.db.flush()

        query_passos = select(PassoCasoTeste.id).where(PassoCasoTeste.caso_teste_id == caso_id)
        result_passos = await self.db.execute(query_passos)
        passos_ids = result_passos.scalars().all()

        if passos_ids:
            exec_passos_bulk = [
                ExecucaoPasso(
                    execucao_teste_id=nova_execucao.id,
                    passo_caso_teste_id=pid,
                    status="pendente",
                    resultado_obtido=""
                ) for pid in passos_ids
            ]
            self.db.add_all(exec_passos_bulk)

        await self.db.commit()
        return await self.get_execucao_by_id(nova_execucao.id)

    async def get_execucao_by_id(self, execucao_id: int) -> Optional[ExecucaoTeste]:
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template),
                selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(ExecucaoTeste.id == execucao_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_minhas_execucoes(
        self, 
        usuario_id: int, 
        status: Optional[StatusExecucaoEnum] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Sequence[ExecucaoTeste]:
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template),
                selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(ExecucaoTeste.responsavel_id == usuario_id)
        )

        if status:
            query = query.where(ExecucaoTeste.status_geral == status)

        query = query.offset(skip).limit(limit).order_by(ExecucaoTeste.updated_at.desc())
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_execucao_passo(self, passo_id: int) -> Optional[ExecucaoPasso]:
        return await self.db.get(ExecucaoPasso, passo_id)

    async def update_execucao_passo(self, passo_exec_id: int, data: ExecucaoPassoUpdate) -> Optional[ExecucaoPasso]:
        exec_passo = await self.db.get(ExecucaoPasso, passo_exec_id)
        
        if exec_passo:
            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(exec_passo, key, value)
            
            if update_data:
                await self.db.commit()
                
                query = (
                    select(ExecucaoPasso)
                    .options(selectinload(ExecucaoPasso.passo_template))
                    .where(ExecucaoPasso.id == passo_exec_id)
                )
                result = await self.db.execute(query)
                return result.scalars().first()
                
        return exec_passo
    
    async def update_status_geral_execucao(self, execucao_id: int, status: StatusExecucaoEnum) -> Optional[ExecucaoTeste]:
        execucao = await self.db.get(ExecucaoTeste, execucao_id)
        if execucao and execucao.status_geral != status:
            execucao.status_geral = status
            await self.db.commit()
            await self.db.refresh(execucao)
        return execucao