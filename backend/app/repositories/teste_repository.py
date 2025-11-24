from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional, List
from sqlalchemy import func

from app.models.testing import (
    CicloTeste, CasoTeste, PassoCasoTeste, 
    ExecucaoTeste, ExecucaoPasso, 
    StatusExecucaoEnum
)
from app.schemas.caso_teste import CasoTesteCreate
from app.schemas.ciclo_teste import CicloTesteCreate
from app.schemas.execucao_teste import ExecucaoPassoUpdate

class TesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- CASOS DE TESTE ---
    async def create_caso_teste(self, projeto_id: int, caso_data: CasoTesteCreate) -> CasoTeste:
        # 1. Criar o Caso
        db_caso = CasoTeste(
            projeto_id=projeto_id,
            nome=caso_data.nome,
            descricao=caso_data.descricao,
            pre_condicoes=caso_data.pre_condicoes,
            #criterios_aceitacao=caso_data.criterios_aceitacao,
            prioridade=caso_data.prioridade
        )
        self.db.add(db_caso)
        await self.db.flush() 

        # 2. Criar os Passos
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
        
        # 3. TRUQUE IMPORTANTE: 
        # Em vez de apenas refresh, vamos buscar o objeto completo com os relacionamentos carregados.
        # Isso evita o erro de MissingGreenlet porque garantimos que 'passos' está na memória.
        return await self.get_caso_teste_by_id(db_caso.id)

    async def get_caso_teste_by_id(self, caso_id: int) -> Optional[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(selectinload(CasoTeste.passos)) # Eager Load obrigatório
            .where(CasoTeste.id == caso_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_casos_by_projeto(
        self, 
        projeto_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> Sequence[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(selectinload(CasoTeste.passos)) # Eager Load obrigatório para listar
            .where(CasoTeste.projeto_id == projeto_id)
            .offset(skip)
            .limit(limit)
            .order_by(CasoTeste.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def count_casos_by_projeto(self, projeto_id: int) -> int:
        query = select(func.count()).select_from(CasoTeste).where(CasoTeste.projeto_id == projeto_id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    # --- CICLOS DE TESTE ---
    async def create_ciclo(self, projeto_id: int, ciclo_data: CicloTesteCreate) -> CicloTeste:
        dados_ciclo = ciclo_data.model_dump(exclude={'projeto_id'})
        db_ciclo = CicloTeste(projeto_id=projeto_id, **dados_ciclo)
        self.db.add(db_ciclo)
        await self.db.commit()
        await self.db.refresh(db_ciclo)
        return db_ciclo

    async def list_ciclos_by_projeto(
        self, 
        projeto_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Sequence[CicloTeste]:
        query = (
            select(CicloTeste)
            .where(CicloTeste.projeto_id == projeto_id)
            .offset(skip)
            .limit(limit)
            .order_by(CicloTeste.data_inicio.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    # --- EXECUÇÃO ---
    
    async def criar_planejamento_execucao(self, ciclo_id: int, caso_id: int, responsavel_id: int) -> ExecucaoTeste:
        nova_execucao = ExecucaoTeste(
            ciclo_teste_id=ciclo_id,
            caso_teste_id=caso_id,
            responsavel_id=responsavel_id,
            status_geral=StatusExecucaoEnum.pendente
        )
        self.db.add(nova_execucao)
        await self.db.flush()

        # Busca IDs dos passos para copiar
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
        # Retorna objeto completo carregado
        return await self.get_execucao_by_id(nova_execucao.id)

    async def get_execucao_by_id(self, execucao_id: int) -> Optional[ExecucaoTeste]:
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
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
            .options(selectinload(ExecucaoTeste.caso_teste))
            .where(ExecucaoTeste.responsavel_id == usuario_id)
        )

        if status:
            query = query.where(ExecucaoTeste.status_geral == status)
        else:
            query = query.where(ExecucaoTeste.status_geral != StatusExecucaoEnum.passou)
            
        query = query.offset(skip).limit(limit).order_by(ExecucaoTeste.updated_at.desc())
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_execucao_passo(self, passo_exec_id: int, data: ExecucaoPassoUpdate) -> Optional[ExecucaoPasso]:
        exec_passo = await self.db.get(ExecucaoPasso, passo_exec_id)
        if exec_passo:
            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(exec_passo, key, value)
            
            if update_data:
                await self.db.commit()
                await self.db.refresh(exec_passo)
        return exec_passo
    
    async def update_status_geral_execucao(self, execucao_id: int, status: StatusExecucaoEnum) -> Optional[ExecucaoTeste]:
        execucao = await self.db.get(ExecucaoTeste, execucao_id)
        if execucao and execucao.status_geral != status:
            execucao.status_geral = status
            await self.db.commit()
            await self.db.refresh(execucao)
        return execucao