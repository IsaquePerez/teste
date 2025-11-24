from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_

# Importação no SINGULAR como você pediu
from app.models.metrica import Metrica, TipoMetricaEnum
from app.models.testing import ExecucaoTeste, StatusExecucaoEnum

class MetricaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_metrica(self, metrica: Metrica) -> Metrica:
        self.db.add(metrica)
        await self.db.commit()
        await self.db.refresh(metrica)
        return metrica

    async def get_metricas_by_projeto(self, projeto_id: int, limit: int = 10):
        # Traz apenas as últimas 10 métricas geradas (histórico recente)
        query = (
            select(Metrica)
            .where(Metrica.projeto_id == projeto_id)
            .order_by(Metrica.data_medicao.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def calcular_totais_por_ciclo(self, ciclo_id: int):
        """
        Calcula estatísticas agregadas no banco de dados.
        Extremamente performático para grandes volumes de dados.
        """
        query = select(
            func.count(ExecucaoTeste.id).label("total"),
            # Soma condicional (CASE WHEN status = 'passou' THEN 1 ELSE 0)
            func.sum(case((ExecucaoTeste.status_geral == StatusExecucaoEnum.passou, 1), else_=0)).label("aprovados"),
            func.sum(case((ExecucaoTeste.status_geral == StatusExecucaoEnum.falhou, 1), else_=0)).label("reprovados"),
            func.sum(case((ExecucaoTeste.status_geral != StatusExecucaoEnum.pendente, 1), else_=0)).label("executados")
        ).where(ExecucaoTeste.ciclo_teste_id == ciclo_id)

        result = await self.db.execute(query)
        # Retorna uma linha com as colunas: total, aprovados, reprovados, executados
        return result.one()

    async def verificar_metrica_existente(self, ciclo_id: int, tipo: TipoMetricaEnum) -> bool:
        """Verifica se já existe métrica calculada hoje para não duplicar à toa"""
        # Exemplo de otimização: evitar insert duplicado no mesmo dia/ciclo
        query = select(Metrica.id).where(
            and_(
                Metrica.ciclo_teste_id == ciclo_id,
                Metrica.tipo_metrica == tipo
            )
        ).limit(1)
        result = await self.db.execute(query)
        return result.first() is not None