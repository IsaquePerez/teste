from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional

# CORREÇÃO: Adicionado StatusPassoEnum na importação
from app.models.testing import (
    ExecucaoTeste, ExecucaoPasso, PassoCasoTeste, 
    CasoTeste, StatusExecucaoEnum, StatusPassoEnum
)
from app.models.usuario import Usuario
from app.schemas.execucao_teste import ExecucaoPassoUpdate

class ExecucaoTesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verificar_pendencias_ciclo(self, ciclo_id: int) -> bool:
        query = select(ExecucaoTeste).where(
            ExecucaoTeste.ciclo_teste_id == ciclo_id,
            ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.pendente, StatusExecucaoEnum.em_progresso])
        )
        result = await self.db.execute(query)
        return result.scalars().first() is not None

    async def criar_planejamento(self, ciclo_id: int, caso_id: int, responsavel_id: int) -> ExecucaoTeste:
        nova_exec = ExecucaoTeste(
            ciclo_teste_id=ciclo_id, 
            caso_teste_id=caso_id, 
            responsavel_id=responsavel_id, 
            status_geral=StatusExecucaoEnum.pendente
        )
        self.db.add(nova_exec)
        await self.db.flush() 

        query_passos = select(PassoCasoTeste.id).where(PassoCasoTeste.caso_teste_id == caso_id)
        passos_ids = (await self.db.execute(query_passos)).scalars().all()
        
        if passos_ids:
            novos_passos_execucao = [
                ExecucaoPasso(
                    execucao_teste_id=nova_exec.id, 
                    passo_caso_teste_id=pid, 
                    status="pendente", 
                    resultado_obtido=""
                ) 
                for pid in passos_ids
            ]
            self.db.add_all(novos_passos_execucao)
        
        await self.db.commit()
        return await self.get_by_id(nova_exec.id)

    async def get_by_id(self, id: int):
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste).options(
                    selectinload(CasoTeste.passos),
                    selectinload(CasoTeste.projeto),
                    selectinload(CasoTeste.ciclo)
                ),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template),
                selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(ExecucaoTeste.ciclo)
            )
            .where(ExecucaoTeste.id == id)
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
                selectinload(ExecucaoTeste.ciclo),
                selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(ExecucaoTeste.caso_teste).options(
                    selectinload(CasoTeste.passos), 
                    selectinload(CasoTeste.ciclo), 
                    selectinload(CasoTeste.projeto)
                ),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
            )
            .where(ExecucaoTeste.responsavel_id == usuario_id)
        )

        if status:
            query = query.where(ExecucaoTeste.status_geral == status)

        query = query.order_by(ExecucaoTeste.updated_at.desc()).offset(skip).limit(limit)
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_execucao_passo(self, passo_id: int) -> Optional[ExecucaoPasso]:
        return await self.db.get(ExecucaoPasso, passo_id)

    async def update_passo(self, passo_id: int, data: ExecucaoPassoUpdate) -> Optional[ExecucaoPasso]:
        passo = await self.db.get(ExecucaoPasso, passo_id)
        
        if passo:
            update_data = data.model_dump(exclude_unset=True)
            for k, v in update_data.items():
                setattr(passo, k, v)
            
            await self.db.commit()
            
            query = (
                select(ExecucaoPasso)
                .options(selectinload(ExecucaoPasso.passo_template))
                .where(ExecucaoPasso.id == passo_id)
            )
            result = await self.db.execute(query)
            return result.scalars().first()
            
        return None

    # Método original para update de status (mantido para compatibilidade interna)
    async def update_status_geral(self, exec_id: int, status: StatusExecucaoEnum) -> Optional[ExecucaoTeste]:
        return await self.update_status(exec_id, status)

    async def listar_passos(self, execucao_id: int):
        query = select(ExecucaoPasso).where(ExecucaoPasso.execucao_teste_id == execucao_id)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    # --- MÉTODOS DE SINCRONIZAÇÃO DE STATUS ---
    
    # 1. Método principal usado pelo DefeitoService
    # --- MÉTODO CORRIGIDO (COM RETORNO) ---
    async def update_status(self, id: int, status: StatusExecucaoEnum):
        # 1. Atualiza o status geral da execução
        stmt = (
            update(ExecucaoTeste)
            .where(ExecucaoTeste.id == id)
            .values(status_geral=status)
            .execution_options(synchronize_session="fetch")
        )
        await self.db.execute(stmt)

        # 2. SE FOR RETESTE: Reseta APENAS os passos reprovados
        if status == StatusExecucaoEnum.reteste:
            stmt_passos = (
                update(ExecucaoPasso)
                .where(
                    ExecucaoPasso.execucao_teste_id == id,
                    # IMPORTANTE: Só reseta o que falhou. O que passou continua verde.
                    ExecucaoPasso.status == StatusPassoEnum.reprovado 
                )
                .values(
                    status=StatusPassoEnum.pendente,   # Volta para cinza (a testar)
                    resultado_obtido="",               # Limpa o texto do erro antigo
                    evidencias="[]"                    # Limpa as fotos antigas
                )
            )
            await self.db.execute(stmt_passos)

        await self.db.commit()
        
        return await self.get_by_id(id)

    # 2. Alias para compatibilidade com o ExecucaoTesteService
    async def atualizar_status_geral(self, execucao_id: int, novo_status: StatusExecucaoEnum):
        return await self.update_status(execucao_id, novo_status)