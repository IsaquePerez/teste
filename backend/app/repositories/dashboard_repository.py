from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from app.models.projeto import Projeto, StatusProjetoEnum
from app.models.testing import (
    CicloTeste, StatusCicloEnum, 
    CasoTeste, 
    Defeito, StatusDefeitoEnum, SeveridadeDefeitoEnum,
    ExecucaoTeste, StatusExecucaoEnum
)
from app.models.modulo import Modulo

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis_gerais(self):
        # Queries Originais de Contagem
        q_projetos = select(func.count(Projeto.id)).where(Projeto.status == StatusProjetoEnum.ativo)
        q_ciclos = select(func.count(CicloTeste.id)).where(CicloTeste.status == StatusCicloEnum.em_execucao)
        q_casos = select(func.count(CasoTeste.id))
        q_defeitos_abertos = select(func.count(Defeito.id)).where(Defeito.status == StatusDefeitoEnum.aberto)
        
        # --- NOVAS QUERIES (Para os 8 Cards) ---
        
        # 1. Total Bloqueados (Testes em ciclos ativos que estão impedidos)
        q_bloqueados = (
            select(func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(
                CicloTeste.status == StatusCicloEnum.em_execucao,
                ExecucaoTeste.status_geral == StatusExecucaoEnum.bloqueado
            )
        )

        # 2. Defeitos Críticos (Abertos e com severidade Crítica)
        q_criticos = select(func.count(Defeito.id)).where(
            Defeito.status != StatusDefeitoEnum.fechado,
            Defeito.severidade == SeveridadeDefeitoEnum.critico
        )

        # 3. Aguardando Reteste (Status 'corrigido')
        q_reteste = select(func.count(Defeito.id)).where(
            Defeito.status == StatusDefeitoEnum.corrigido
        )

        # 4. Cálculo de Taxa de Sucesso (Passou / Total Finalizado)
        # Finalizado = Passou + Falhou + Bloqueado (Ignora pendente/em_progresso)
        
        q_passou = (
            select(func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(
                CicloTeste.status == StatusCicloEnum.em_execucao,
                ExecucaoTeste.status_geral == StatusExecucaoEnum.passou
            )
        )

        q_total_finalizados = (
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

        # Executando queries
        results = {}
        results["total_projetos"] = (await self.db.execute(q_projetos)).scalar() or 0
        results["total_ciclos_ativos"] = (await self.db.execute(q_ciclos)).scalar() or 0
        results["total_casos_teste"] = (await self.db.execute(q_casos)).scalar() or 0
        results["total_defeitos_abertos"] = (await self.db.execute(q_defeitos_abertos)).scalar() or 0
        
        results["total_bloqueados"] = (await self.db.execute(q_bloqueados)).scalar() or 0
        results["total_defeitos_criticos"] = (await self.db.execute(q_criticos)).scalar() or 0
        results["total_aguardando_reteste"] = (await self.db.execute(q_reteste)).scalar() or 0
        
        passou = (await self.db.execute(q_passou)).scalar() or 0
        total_finalizados = (await self.db.execute(q_total_finalizados)).scalar() or 0

        # Evita divisão por zero
        if total_finalizados > 0:
            results["taxa_sucesso_ciclos"] = round((passou / total_finalizados) * 100, 1)
        else:
            results["taxa_sucesso_ciclos"] = 0.0

        return results

    async def get_status_execucao_geral(self):
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            .join(CicloTeste)
            .where(CicloTeste.status == StatusCicloEnum.em_execucao)
            .group_by(ExecucaoTeste.status_geral)
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_defeitos_por_severidade(self):
        query = (
            select(Defeito.severidade, func.count(Defeito.id))
            .where(Defeito.status != StatusDefeitoEnum.fechado)
            .group_by(Defeito.severidade)
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_modulos_com_mais_defeitos(self, limit: int = 5):
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