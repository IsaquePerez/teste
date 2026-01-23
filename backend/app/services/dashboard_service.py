from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.dashboard_repository import DashboardRepository
from app.models.testing import StatusExecucaoEnum, SeveridadeDefeitoEnum
from app.schemas.dashboard import (
    DashboardResponse, DashboardKPI, DashboardCharts, ChartDataPoint,
    RunnerDashboardResponse, RunnerKPI, RunnerRankingData, StatusDistributionData, TimelineItem, RunnerDashboardCharts
)

class DashboardService:
    # Cores (Ajustado para os termos do Banco: PT-BR snake_case)
    STATUS_COLORS = {
        "pendente": "#94a3b8",      # Cinza
        "em_progresso": "#3b82f6",  # Azul
        "reteste": "#f59e0b",       # Laranja
        "fechado": "#10b981",       # Verde (Sucesso)
        "bloqueado": "#ef4444"      # Vermelho
    }

    SEVERITY_COLORS = {
        "critico": "#991b1b",
        "alto": "#ef4444",
        "medio": "#f59e0b",
        "baixo": "#3b82f6"
    }

    def __init__(self, db: AsyncSession):
        self.repo = DashboardRepository(db)

    async def get_dashboard_data(self, sistema_id: int = None) -> DashboardResponse:
        kpis_data = await self.repo.get_kpis_gerais(sistema_id)
        exec_status_data = await self.repo.get_status_execucao_geral(sistema_id)
        severity_data = await self.repo.get_defeitos_por_severidade(sistema_id)
        modules_data = await self.repo.get_modulos_com_mais_defeitos(limit=5, sistema_id=sistema_id)

        # KPIs
        kpis = DashboardKPI(
            total_projetos=kpis_data.get("total_projetos", 0),
            total_ciclos_ativos=kpis_data.get("total_ciclos_ativos", 0),
            total_casos_teste=kpis_data.get("total_casos_teste", 0),
            taxa_sucesso_ciclos=kpis_data.get("taxa_sucesso_ciclos", 0.0),
            total_defeitos_abertos=kpis_data.get("total_defeitos_abertos", 0),
            total_defeitos_criticos=kpis_data.get("total_defeitos_criticos", 0),
            total_pendentes=kpis_data.get("total_pendentes", 0),
            total_bloqueados=kpis_data.get("total_bloqueados", 0),
            total_aguardando_reteste=kpis_data.get("total_aguardando_reteste", 0)
        )

        # Gráficos
        charts = DashboardCharts(
            status_execucao=self._format_chart_data(exec_status_data, self.STATUS_COLORS),
            defeitos_por_severidade=self._format_chart_data(severity_data, self.SEVERITY_COLORS),
            top_modulos_defeitos=[ChartDataPoint(label=nome, name=nome, value=count) for nome, count in modules_data]
        )

        return DashboardResponse(kpis=kpis, charts=charts)

    async def get_runner_dashboard_data(self, runner_id: Optional[int] = None) -> RunnerDashboardResponse:
        raw_kpis = await self.repo.get_runner_kpis(runner_id)
        status_dist = await self.repo.get_status_distribution(runner_id)
        raw_timeline = await self.repo.get_runner_timeline(runner_id)

        kpis = RunnerKPI(
            total_execucoes_concluidas=raw_kpis.get("total_concluidos", 0),
            total_defeitos_reportados=raw_kpis.get("total_defeitos", 0),
            tempo_medio_execucao_minutos=raw_kpis.get("tempo_medio_minutos", 0.0),
            testes_em_fila=raw_kpis.get("total_fila", 0),
            ultima_atividade=raw_kpis.get("ultima_atividade", None)
        )

        ranking_data = []
        if not runner_id:
            ranking_raw = await self.repo.get_ranking_runners()
            ranking_data = [RunnerRankingData(label=name, value=total, color="#3b82f6") for name, total in ranking_raw]

        dist_data = [
            StatusDistributionData(
                name=self._normalize_key(status).upper().replace("_", " "),
                value=count,
                color=self.STATUS_COLORS.get(self._normalize_key(status), "#94a3b8")
            )
            for status, count in status_dist
        ]

        timeline_data = [
            TimelineItem(
                id=execution.id,
                case_name=execution.caso_teste.nome if execution.caso_teste else "Caso Removido",
                status=self._normalize_key(execution.status_geral),
                assignee=execution.responsavel.nome if execution.responsavel else "Não atribuído",
                updated_at=execution.updated_at
            )
            for execution in raw_timeline
        ]

        charts = RunnerDashboardCharts(
            ranking_produtividade=ranking_data,
            status_distribuicao=dist_data,
            timeline=timeline_data
        )

        return RunnerDashboardResponse(kpis=kpis, charts=charts)

    def _normalize_key(self, item: Any) -> str:
        if hasattr(item, 'value'): return str(item.value).lower()
        return str(item).lower()

    def _format_chart_data(self, data: List[tuple], color_map: Dict) -> List[ChartDataPoint]:
        chart_list = []
        for item, count in data:
            key_normalized = self._normalize_key(item)
            # Remove underline e capitaliza para exibição
            label = key_normalized.replace("_", " ").title()
            
            # Tentar pegar cor pela chave normalizada
            color = color_map.get(key_normalized, "#cbd5e1")
            
            chart_list.append(ChartDataPoint(label=label, name=key_normalized, value=count, color=color))
        return chart_list