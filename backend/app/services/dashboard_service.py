from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import (
    DashboardResponse, 
    DashboardKPI, 
    DashboardCharts, 
    ChartDataPoint
)
from app.models.testing import StatusExecucaoEnum, SeveridadeDefeitoEnum

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.repo = DashboardRepository(db)

    async def get_dashboard_data(self) -> DashboardResponse:
        # 1. Busca dados brutos em paralelo 
        kpis_data = await self.repo.get_kpis_gerais()
        status_exec_data = await self.repo.get_status_execucao_geral()
        severidade_data = await self.repo.get_defeitos_por_severidade()
        modulos_data = await self.repo.get_modulos_com_mais_defeitos()

        # 2. Formata KPIs
        kpis = DashboardKPI(
            total_projetos=kpis_data["total_projetos"],
            total_ciclos_ativos=kpis_data["total_ciclos_ativos"],
            total_casos_teste=kpis_data["total_casos_teste"],
            total_defeitos_abertos=kpis_data["total_defeitos_abertos"]
        )

        # 3. Formata Gráfico de Execução (Rosca)
        chart_status = []
        color_map_status = {
            StatusExecucaoEnum.passou: "#10b981",       
            StatusExecucaoEnum.falhou: "#ef4444",       
            StatusExecucaoEnum.bloqueado: "#f59e0b",    
            StatusExecucaoEnum.pendente: "#cbd5e1",     
            StatusExecucaoEnum.em_progresso: "#3b82f6"  
        }
        
        for status, count in status_exec_data:
            chart_status.append(ChartDataPoint(
                label=status.value.upper(),
                value=count,
                color=color_map_status.get(status, "#64748b")
            ))

        # 4. Formata Gráfico de Severidade (Barras)
        chart_severidade = []
        color_map_sev = {
            SeveridadeDefeitoEnum.critico: "#7f1d1d",
            SeveridadeDefeitoEnum.alto: "#b91c1c",
            SeveridadeDefeitoEnum.medio: "#f59e0b",
            SeveridadeDefeitoEnum.bajo: "#10b981"
        }

        for sev, count in severidade_data:
            chart_severidade.append(ChartDataPoint(
                label=sev.value.upper(),
                value=count,
                color=color_map_sev.get(sev, "#000000")
            ))

        # 5. Formata Top Módulos
        chart_modulos = [
            ChartDataPoint(label=nome, value=count) 
            for nome, count in modulos_data
        ]

        charts = DashboardCharts(
            status_execucao=chart_status,
            defeitos_por_severidade=chart_severidade,
            top_modulos_defeitos=chart_modulos
        )

        return DashboardResponse(kpis=kpis, charts=charts)