from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.metrica_repository import MetricaRepository
from app.models.metrica import Metrica, TipoMetricaEnum
from app.models.projeto import Projeto

class MetricaService:
    def __init__(self, db: AsyncSession):
        self.repo = MetricaRepository(db)
        self.db = db

    async def gerar_metricas_execucao(self, projeto_id: int, ciclo_id: int):
        """
        Calcula snapshot de qualidade do ciclo atual e salva histórico.
        """
        stats = await self.repo.calcular_totais_por_ciclo(ciclo_id)
        
        total = stats.total or 0
        aprovados = stats.aprovados or 0
        reprovados = stats.reprovados or 0
        executados = stats.executados or 0

        taxa_sucesso = (aprovados / executados * 100) if executados > 0 else 0.0

        nova_metrica = Metrica(
            projeto_id=projeto_id,
            ciclo_teste_id=ciclo_id,
            tipo_metrica=TipoMetricaEnum.qualidade,
            nome_metrica="Taxa de Sucesso de Testes",
            valor_metrica=taxa_sucesso,
            unidade_medida="%",
            casos_reprovados=reprovados,
            casos_executados=executados,
            casos_aprovados=aprovados,
            descricao=f"Gerado automaticamente a partir do ciclo {ciclo_id}"
        )

        return await self.repo.create_metrica(nova_metrica)

    async def listar_metricas_projeto(self, projeto_id: int):
        return await self.repo.get_metricas_by_projeto(projeto_id)