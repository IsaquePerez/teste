from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, case, or_
from typing import List, Dict, Any, Optional

from app.models.modulo import Modulo
from app.models.projeto import Projeto, StatusProjetoEnum
from app.models.testing import (
    CicloTeste, StatusCicloEnum, 
    CasoTeste, 
    Defeito, StatusDefeitoEnum, SeveridadeDefeitoEnum,
    ExecucaoTeste, StatusExecucaoEnum
)
from app.models.usuario import Usuario

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis_gerais(self, sistema_id: Optional[int] = None) -> Dict[str, Any]:
        # --- 1. PROJETOS ---
        q_projetos = select(func.count(Projeto.id)).where(Projeto.status == StatusProjetoEnum.ativo)
        if sistema_id:
            q_projetos = q_projetos.where(Projeto.sistema_id == sistema_id)

        # --- 2. CICLOS ---
        q_ciclos = select(func.count(CicloTeste.id)).join(Projeto).where(
            CicloTeste.status.in_([StatusCicloEnum.em_execucao, StatusCicloEnum.planejado])
        )
        if sistema_id:
            q_ciclos = q_ciclos.where(Projeto.sistema_id == sistema_id)

        # --- 3. CASOS DE TESTE ---
        q_casos = select(func.count(CasoTeste.id)).join(Projeto)
        if sistema_id:
            q_casos = q_casos.where(Projeto.sistema_id == sistema_id)

        # --- 4. DEFEITOS ABERTOS ---
        q_defeitos_abertos = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status.in_([StatusDefeitoEnum.aberto, StatusDefeitoEnum.em_teste]))
        )
        if sistema_id:
            q_defeitos_abertos = q_defeitos_abertos.where(Projeto.sistema_id == sistema_id)

        # --- 5. DEFEITOS CRITICOS/ALTOS ---
        q_criticos = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(
                Defeito.status != StatusDefeitoEnum.fechado,
                Defeito.severidade.in_([SeveridadeDefeitoEnum.critico, SeveridadeDefeitoEnum.alto])
            )
        )
        if sistema_id:
            q_criticos = q_criticos.where(Projeto.sistema_id == sistema_id)

        # --- 6. AGUARDANDO RETESTE (Defeitos corrigidos) ---
        q_reteste = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status == StatusDefeitoEnum.corrigido)
        )
        if sistema_id:
            q_reteste = q_reteste.where(Projeto.sistema_id == sistema_id)

        # --- 7. EXECUÇÕES PENDENTES E BLOQUEADAS ---
        # Query base para execuções
        q_exec_base = (
            select(
                func.sum(case((ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.pendente, StatusExecucaoEnum.em_progresso]), 1), else_=0)),
                func.sum(case((ExecucaoTeste.status_geral == StatusExecucaoEnum.bloqueado, 1), else_=0)),
                func.sum(case((ExecucaoTeste.status_geral == StatusExecucaoEnum.reteste, 1), else_=0))
            )
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
        )
        if sistema_id:
            q_exec_base = q_exec_base.where(Projeto.sistema_id == sistema_id)

        # --- 8. FINALIZADOS (Para taxa de sucesso) ---
        q_finalizados = (
            select(func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(ExecucaoTeste.status_geral == StatusExecucaoEnum.fechado)
        )
        if sistema_id:
            q_finalizados = q_finalizados.where(Projeto.sistema_id == sistema_id)

        # --- EXECUÇÃO DAS QUERIES ---
        total_projetos = (await self.db.execute(q_projetos)).scalar() or 0
        total_ciclos = (await self.db.execute(q_ciclos)).scalar() or 0
        total_casos = (await self.db.execute(q_casos)).scalar() or 0
        total_defeitos = (await self.db.execute(q_defeitos_abertos)).scalar() or 0
        total_criticos = (await self.db.execute(q_criticos)).scalar() or 0
        total_reteste_def = (await self.db.execute(q_reteste)).scalar() or 0
        
        exec_stats = (await self.db.execute(q_exec_base)).first()
        pendentes = exec_stats[0] or 0
        bloqueados = exec_stats[1] or 0
        aguardando_reteste_exec = exec_stats[2] or 0 # Execuções em reteste

        # Você pode decidir se usa defeitos corrigidos ou execuções em reteste para o KPI 'total_aguardando_reteste'
        # Aqui somamos para garantir cobertura
        total_aguardando_reteste = total_reteste_def + aguardando_reteste_exec
        
        tot_fin = (await self.db.execute(q_finalizados)).scalar() or 0
        
        # Cálculo da taxa (Finalizados / (Pendentes + Finalizados)) ou sobre o total
        # Usando lógica simples: Concluídos / (Concluídos + Pendentes)
        denominador = pendentes + tot_fin
        taxa = round((tot_fin / denominador * 100), 1) if denominador > 0 else 0.0

        return {
            "total_projetos": total_projetos,
            "total_ciclos_ativos": total_ciclos,
            "total_casos_teste": total_casos,
            "taxa_sucesso_ciclos": taxa,
            "total_defeitos_abertos": total_defeitos,
            "total_defeitos_criticos": total_criticos,
            "total_pendentes": pendentes,
            "total_bloqueados": bloqueados,
            "total_aguardando_reteste": total_aguardando_reteste
        }

    async def get_status_execucao_geral(self, sistema_id: Optional[int] = None) -> List[tuple]:
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .group_by(ExecucaoTeste.status_geral)
        )
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)
            
        result = await self.db.execute(query)
        return result.all()

    async def get_defeitos_por_severidade(self, sistema_id: Optional[int] = None) -> List[tuple]:
        query = (
            select(Defeito.severidade, func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status != StatusDefeitoEnum.fechado)
            .group_by(Defeito.severidade)
        )
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)
            
        result = await self.db.execute(query)
        return result.all()
    
    async def get_modulos_com_mais_defeitos(self, limit: int = 5, sistema_id: Optional[int] = None) -> List[tuple]:
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
        
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)

        result = await self.db.execute(query)
        return result.all()

    # --- MÉTODOS RUNNER (Convertidos para ORM) ---
    async def get_runner_kpis(self, runner_id: int) -> Dict[str, Any]:
        # Concluídos (Fechado ou Bloqueado)
        q_concluidos = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.responsavel_id == runner_id,
            ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.fechado, StatusExecucaoEnum.bloqueado])
        )

        # Defeitos reportados pelo runner
        q_defeitos = select(func.count(Defeito.id)).join(Defeito.execucao).where(
            ExecucaoTeste.responsavel_id == runner_id
        )

        # Fila (Pendentes)
        q_fila = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.responsavel_id == runner_id,
            ExecucaoTeste.status_geral == StatusExecucaoEnum.pendente
        )

        # Última atividade
        q_last = select(func.max(ExecucaoTeste.updated_at)).where(
            ExecucaoTeste.responsavel_id == runner_id
        )

        total_concluidos = (await self.db.execute(q_concluidos)).scalar() or 0
        total_defeitos = (await self.db.execute(q_defeitos)).scalar() or 0
        total_fila = (await self.db.execute(q_fila)).scalar() or 0
        ultima_atividade = (await self.db.execute(q_last)).scalar()

        return {
            "total_concluidos": total_concluidos,
            "total_defeitos": total_defeitos,
            "tempo_medio_minutos": 0.0, # Placeholder
            "total_fila": total_fila,
            "ultima_atividade": ultima_atividade
        }

    async def get_status_distribution(self, runner_id: Optional[int] = None) -> List[tuple]:
        query = select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id)).group_by(ExecucaoTeste.status_geral)
        if runner_id:
            query = query.where(ExecucaoTeste.responsavel_id == runner_id)
        
        result = await self.db.execute(query)
        return result.all()

    async def get_runner_timeline(self, runner_id: Optional[int] = None, limit: int = 10):
        # Para timeline, precisamos carregar os relacionamentos para exibir nomes
        from sqlalchemy.orm import selectinload
        
        query = (
            select(ExecucaoTeste)
            .options(selectinload(ExecucaoTeste.caso_teste), selectinload(ExecucaoTeste.responsavel))
            .order_by(desc(ExecucaoTeste.updated_at))
            .limit(limit)
        )
        if runner_id:
            query = query.where(ExecucaoTeste.responsavel_id == runner_id)
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_ranking_runners(self, limit: int = 5) -> List[tuple]:
        query = (
            select(Usuario.nome, func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste, Usuario.id == ExecucaoTeste.responsavel_id)
            .where(ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.fechado, StatusExecucaoEnum.bloqueado]))
            .group_by(Usuario.nome)
            .order_by(desc(func.count(ExecucaoTeste.id)))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.all()