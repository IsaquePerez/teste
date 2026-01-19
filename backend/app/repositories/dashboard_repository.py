from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload

from app.models.projeto import Projeto, StatusProjetoEnum
from app.models.testing import (
    CicloTeste, StatusCicloEnum, 
    CasoTeste, 
    Defeito, StatusDefeitoEnum, SeveridadeDefeitoEnum,
    ExecucaoTeste, StatusExecucaoEnum
)
from app.models.modulo import Modulo
from app.models.usuario import Usuario

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_general_kpis(self):
        """Fetches high-level metrics for the main dashboard."""
        
        # Base entity counts
        projects_query = select(func.count(Projeto.id)).where(Projeto.status == StatusProjetoEnum.ativo)
        active_cycles_query = select(func.count(CicloTeste.id)).where(CicloTeste.status == StatusCicloEnum.em_execucao)
        test_cases_query = select(func.count(CasoTeste.id))
        open_defects_query = select(func.count(Defeito.id)).where(Defeito.status == StatusDefeitoEnum.aberto)
        
        # Specific QA metrics
        blocked_tests_query = (
            select(func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(
                CicloTeste.status == StatusCicloEnum.em_execucao,
                ExecucaoTeste.status_geral == StatusExecucaoEnum.bloqueado
            )
        )

        critical_defects_query = select(func.count(Defeito.id)).where(
            Defeito.status != StatusDefeitoEnum.fechado,
            Defeito.severidade == SeveridadeDefeitoEnum.critico
        )

        retest_queue_query = select(func.count(Defeito.id)).where(
            Defeito.status == StatusDefeitoEnum.corrigido
        )

        # Success Rate Logic (Passed vs Total Finished)
        passed_tests_query = (
            select(func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(
                CicloTeste.status == StatusCicloEnum.em_execucao,
                ExecucaoTeste.status_geral == StatusExecucaoEnum.passou
            )
        )

        finished_tests_query = (
            select(func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(
                CicloTeste.status == StatusCicloEnum.em_execucao,
                ExecucaoTeste.status_geral.in_([
                    StatusExecucaoEnum.passou, 
                    StatusExecucaoEnum.falhou, 
                    StatusExecucaoEnum.bloqueado
                ])
            )
        )

        # Execute all queries
        return {
            "total_projetos": (await self.db.execute(projects_query)).scalar() or 0,
            "total_ciclos_ativos": (await self.db.execute(active_cycles_query)).scalar() or 0,
            "total_casos_teste": (await self.db.execute(test_cases_query)).scalar() or 0,
            "total_defeitos_abertos": (await self.db.execute(open_defects_query)).scalar() or 0,
            "total_bloqueados": (await self.db.execute(blocked_tests_query)).scalar() or 0,
            "total_defeitos_criticos": (await self.db.execute(critical_defects_query)).scalar() or 0,
            "total_aguardando_reteste": (await self.db.execute(retest_queue_query)).scalar() or 0,
            "taxa_sucesso_ciclos": self._calculate_success_rate(
                (await self.db.execute(passed_tests_query)).scalar() or 0,
                (await self.db.execute(finished_tests_query)).scalar() or 0
            )
        }

    async def get_general_execution_status(self):
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(CicloTeste.status == StatusCicloEnum.em_execucao)
            .group_by(ExecucaoTeste.status_geral)
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_defects_by_severity(self):
        query = (
            select(Defeito.severidade, func.count(Defeito.id))
            .where(Defeito.status != StatusDefeitoEnum.fechado)
            .group_by(Defeito.severidade)
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_top_defect_modules(self, limit: int = 5):
        query = (
            select(Modulo.nome, func.count(Defeito.id))
            .select_from(Defeito)
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .join(Projeto.modulo)
            .group_by(Modulo.nome)
            .order_by(desc(func.count(Defeito.id)))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.all()

    # --- Runner & Productivity Methods ---

    async def get_runner_kpis(self, runner_id: int = None):
        """Productivity metrics, optionally filtered by user."""
        filters = []
        if runner_id:
            filters.append(ExecucaoTeste.responsavel_id == runner_id)

        # Queries
        completed_query = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.passou, StatusExecucaoEnum.falhou]),
            *filters
        )
        
        pending_query = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.status_geral == StatusExecucaoEnum.pendente,
            *filters
        )

        defects_query = select(func.count(Defeito.id)).join(ExecucaoTeste)
        if runner_id:
            defects_query = defects_query.where(ExecucaoTeste.responsavel_id == runner_id)

        avg_time_query = select(
            func.avg(
                func.extract('epoch', ExecucaoTeste.updated_at) - 
                func.extract('epoch', ExecucaoTeste.created_at)
            )
        ).where(
            ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.passou, StatusExecucaoEnum.falhou]),
            *filters
        )
        
        last_seen_query = select(func.max(ExecucaoTeste.updated_at)).where(*filters)

        # Execution
        avg_seconds = (await self.db.execute(avg_time_query)).scalar() or 0
        
        return {
            "total_concluidos": (await self.db.execute(completed_query)).scalar() or 0,
            "total_defeitos": (await self.db.execute(defects_query)).scalar() or 0,
            "total_fila": (await self.db.execute(pending_query)).scalar() or 0,
            "tempo_medio_minutos": round(avg_seconds / 60, 1),
            "ultima_atividade": (await self.db.execute(last_seen_query)).scalar()
        }

    async def get_ranking_runners(self):
        query = (
            select(Usuario.nome, func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste, Usuario.id == ExecucaoTeste.responsavel_id)
            .where(ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.passou, StatusExecucaoEnum.falhou]))
            .group_by(Usuario.nome)
            .order_by(desc(func.count(ExecucaoTeste.id)))
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_status_distribution(self, runner_id: int = None):
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            .group_by(ExecucaoTeste.status_geral)
        )
        
        if runner_id:
            query = query.where(ExecucaoTeste.responsavel_id == runner_id)
            
        result = await self.db.execute(query)
        return result.all()

    async def get_runner_timeline(self, runner_id: int = None, limit: int = 5):
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste),
                selectinload(ExecucaoTeste.responsavel)
            )
            .order_by(desc(ExecucaoTeste.updated_at))
            .limit(limit)
        )
        
        if runner_id:
            query = query.where(ExecucaoTeste.responsavel_id == runner_id)
            
        result = await self.db.execute(query)
        return result.scalars().all()

    def _calculate_success_rate(self, passed, total):
        if total == 0: 
            return 0.0
        return round((passed / total) * 100, 1)