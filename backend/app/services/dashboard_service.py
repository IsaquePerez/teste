from typing import Optional, Dict, Any
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
       
        # Fetch raw metrics from repository
        kpis_data = await self.repo.get_general_kpis()
        exec_status_data = await self.repo.get_general_execution_status()
        severity_data = await self.repo.get_defects_by_severity()
        modules_data = await self.repo.get_top_defect_modules()

        # Map to Pydantic Schema
        kpis = DashboardKPI(
            total_projetos=kpis_data["total_projetos"],
            total_ciclos_ativos=kpis_data["total_ciclos_ativos"],
            total_casos_teste=kpis_data["total_casos_teste"],
            taxa_sucesso_ciclos=kpis_data["taxa_sucesso_ciclos"],
            
            total_defeitos_abertos=kpis_data["total_defeitos_abertos"],
            total_defeitos_criticos=kpis_data["total_defeitos_criticos"],
            total_bloqueados=kpis_data["total_bloqueados"],
            total_aguardando_reteste=kpis_data["total_aguardando_reteste"]
        )

        # Prepare Execution Status Chart (Pie)
        status_chart = []
        status_colors = {
            StatusExecucaoEnum.passou: "#10b981",       
            StatusExecucaoEnum.falhou: "#ef4444",       
            StatusExecucaoEnum.bloqueado: "#f59e0b",    
            StatusExecucaoEnum.pendente: "#cbd5e1",     
            StatusExecucaoEnum.em_progresso: "#3b82f6"  
        }
        
        for status, count in exec_status_data:
            status_chart.append(ChartDataPoint(
                label=status.value.upper(),
                value=count,
                color=status_colors.get(status, "#64748b")
            ))

        # Prepare Defect Severity Chart (Bar)
        severity_chart = []
        severity_colors = {
            SeveridadeDefeitoEnum.critico: "#7f1d1d",
            SeveridadeDefeitoEnum.alto: "#b91c1c",
            SeveridadeDefeitoEnum.medio: "#f59e0b",
            SeveridadeDefeitoEnum.bajo: "#10b981"
        }

        for sev, count in severity_data:
            severity_chart.append(ChartDataPoint(
                label=sev.value.upper(),
                value=count,
                color=severity_colors.get(sev, "#000000")
            ))

        # Prepare Module Ranking Chart
        modules_chart = [
            ChartDataPoint(label=nome, value=count) 
            for nome, count in modules_data
        ]

        charts = DashboardCharts(
            status_execucao=status_chart,
            defeitos_por_severidade=severity_chart,
            top_modulos_defeitos=modules_chart
        )

        return DashboardResponse(kpis=kpis, charts=charts)
    
    async def get_runner_dashboard_data(self, runner_id: Optional[int] = None) -> Dict[str, Any]:
        
        # Fetch core metrics
        raw_kpis = await self.repo.get_runner_kpis(runner_id)
        status_dist = await self.repo.get_status_distribution(runner_id)
        raw_timeline = await self.repo.get_runner_timeline(runner_id)

        # Fetch Ranking 
        ranking_data = []
        if not runner_id:
            ranking_raw = await self.repo.get_ranking_runners()
            ranking_data = [
                {"label": name, "value": total, "color": "#3b82f6"} 
                for name, total in ranking_raw
            ]

        # Format Status Distribution 
        pie_chart_data = []
        status_colors = {
            "passou": "#10b981", 
            "falhou": "#ef4444", 
            "bloqueado": "#f59e0b", 
            "pendente": "#cbd5e1",
            "em_progresso": "#3b82f6"
        }
        
        for status, count in status_dist:
            # Handle SQLAlchemy Enum return
            status_val = status.value if hasattr(status, 'value') else str(status)
            pie_chart_data.append({
                "name": status_val.upper(),
                "value": count,
                "color": status_colors.get(status_val, "#94a3b8")
            })

        # Format Activity Timeline
        timeline_data = []
        for execution in raw_timeline:
            timeline_data.append({
                "id": execution.id,
                "case_name": execution.caso_teste.nome,
                "status": execution.status_geral.value,
                "assignee": execution.responsavel.nome if execution.responsavel else "Unassigned",
                "updated_at": execution.updated_at
            })

        # Construct Final Response
        return {
            "kpis": {
                "total_execucoes_concluidas": raw_kpis["total_concluidos"],
                "total_defeitos_reportados": raw_kpis["total_defeitos"],
                "tempo_medio_execucao_minutos": raw_kpis["tempo_medio_minutos"],
                "testes_em_fila": raw_kpis["total_fila"],
                "ultima_atividade": raw_kpis["ultima_atividade"]
            },
            "charts": {
                "ranking_produtividade": ranking_data,
                "status_distribuicao": pie_chart_data,
                "timeline": timeline_data
            }
        }