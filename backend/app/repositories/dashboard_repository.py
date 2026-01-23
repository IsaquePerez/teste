from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any, Optional

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis_gerais(self, sistema_id: Optional[int] = None) -> Dict[str, Any]:
        filtro_sistema = ""
        params = {}
        
        if sistema_id:
            filtro_sistema = "JOIN casos_teste ct ON et.caso_teste_id = ct.id WHERE ct.projeto_id IN (SELECT id FROM projetos WHERE sistema_id = :sistema_id)"
            params["sistema_id"] = sistema_id

        q_projetos = text("SELECT COUNT(*) FROM projetos WHERE status = 'ativo'")
        q_ciclos = text("SELECT COUNT(*) FROM ciclos_teste WHERE status = 'ativo'")
        
        base_exec = f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status_geral = 'passou' THEN 1 ELSE 0 END) as passou,
                SUM(CASE WHEN status_geral IN ('pendente', 'em_progresso') THEN 1 ELSE 0 END) as pendente,
                SUM(CASE WHEN status_geral = 'bloqueado' THEN 1 ELSE 0 END) as bloqueado,
                SUM(CASE WHEN status_geral = 'reteste' THEN 1 ELSE 0 END) as reteste
            FROM execucoes_teste et
            {filtro_sistema}
        """
        q_exec = text(base_exec)
        
        q_defeitos = text("""
            SELECT 
                COUNT(*) as total_abertos,
                SUM(CASE WHEN severidade = 'critico' THEN 1 ELSE 0 END) as criticos
            FROM defeitos d
            WHERE status != 'fechado'
        """)

        # --- AQUI ESTÁ A MUDANÇA CRÍTICA PARA EVITAR O ERRO ---
        # Usamos await direto no execute da sessão
        
        # Projetos
        res_proj = await self.db.execute(q_projetos)
        total_projetos = res_proj.scalar() or 0

        # Ciclos
        res_ciclos = await self.db.execute(q_ciclos)
        total_ciclos = res_ciclos.scalar() or 0
        
        # Execuções
        res_exec = await self.db.execute(q_exec, params)
        exec_row = res_exec.first() # Pega a primeira linha
        
        # Extração segura dos dados da linha
        total_exec = getattr(exec_row, 'total', 0) if exec_row else 0
        passou = getattr(exec_row, 'passou', 0) if exec_row else 0
        pendente = getattr(exec_row, 'pendente', 0) if exec_row else 0
        bloqueado = getattr(exec_row, 'bloqueado', 0) if exec_row else 0
        reteste = getattr(exec_row, 'reteste', 0) if exec_row else 0

        # Defeitos
        res_def = await self.db.execute(q_defeitos)
        def_row = res_def.first()
        total_defeitos = getattr(def_row, 'total_abertos', 0) if def_row else 0
        total_criticos = getattr(def_row, 'criticos', 0) if def_row else 0

        taxa = 0.0
        if total_exec > 0 and passou: # Garante que passou não seja None
            taxa = round((float(passou) / total_exec) * 100, 1)

        return {
            "total_projetos": total_projetos,
            "total_ciclos_ativos": total_ciclos,
            "total_casos_teste": total_exec,
            "taxa_sucesso_ciclos": taxa,
            "total_defeitos_abertos": total_defeitos,
            "total_defeitos_criticos": total_criticos,
            "total_pendentes": pendente,
            "total_bloqueados": bloqueado,
            "total_aguardando_reteste": reteste
        }

    async def get_status_execucao_geral(self, sistema_id: Optional[int] = None) -> List[tuple]:
        filtro = ""
        params = {}
        if sistema_id:
            filtro = "JOIN casos_teste ct ON et.caso_teste_id = ct.id JOIN projetos p ON ct.projeto_id = p.id WHERE p.sistema_id = :sistema_id"
            params["sistema_id"] = sistema_id

        query = text(f"""
            SELECT status_geral, COUNT(*) 
            FROM execucoes_teste et
            {filtro}
            GROUP BY status_geral
        """)
        result = await self.db.execute(query, params)
        return result.all()

    async def get_defeitos_por_severidade(self, sistema_id: Optional[int] = None) -> List[tuple]:
        filtro = ""
        params = {}
        if sistema_id:
            filtro = "JOIN execucoes_teste et ON d.execucao_teste_id = et.id JOIN casos_teste ct ON et.caso_teste_id = ct.id JOIN projetos p ON ct.projeto_id = p.id WHERE p.sistema_id = :sistema_id"
            params["sistema_id"] = sistema_id

        query = text(f"""
            SELECT severidade, COUNT(*) 
            FROM defeitos d
            {filtro}
            GROUP BY severidade
        """)
        result = await self.db.execute(query, params)
        return result.all()

    async def get_modulos_com_mais_defeitos(self, limit: int = 5, sistema_id: Optional[int] = None) -> List[tuple]:
        filtro = ""
        params = {"limit": limit}
        if sistema_id:
            filtro = "WHERE p.sistema_id = :sistema_id"
            params["sistema_id"] = sistema_id

        query = text(f"""
            SELECT p.nome as modulo, COUNT(d.id) as total
            FROM defeitos d
            JOIN execucoes_teste et ON d.execucao_teste_id = et.id
            JOIN casos_teste ct ON et.caso_teste_id = ct.id
            JOIN projetos p ON ct.projeto_id = p.id
            {filtro}
            GROUP BY p.nome
            ORDER BY total DESC
            LIMIT :limit
        """)
        result = await self.db.execute(query, params)
        return result.all()

    # --- MÉTODOS DO DASHBOARD DO RUNNER ---
    
    async def get_runner_kpis(self, runner_id: int) -> Dict[str, Any]:
        params = {"rid": runner_id}
        
        q_concluidos = text("SELECT COUNT(*) FROM execucoes_teste WHERE responsavel_id = :rid AND status_geral NOT IN ('pendente', 'em_progresso')")
        q_defeitos = text("SELECT COUNT(*) FROM defeitos d JOIN execucoes_teste et ON d.execucao_teste_id = et.id WHERE et.responsavel_id = :rid")
        q_fila = text("SELECT COUNT(*) FROM execucoes_teste WHERE responsavel_id = :rid AND status_geral = 'pendente'")
        q_last = text("SELECT MAX(updated_at) FROM execucoes_teste WHERE responsavel_id = :rid")

        # Execução individual
        res_conc = await self.db.execute(q_concluidos, params)
        total_concluidos = res_conc.scalar() or 0
        
        res_def = await self.db.execute(q_defeitos, params)
        total_defeitos = res_def.scalar() or 0
        
        res_fila = await self.db.execute(q_fila, params)
        total_fila = res_fila.scalar() or 0
        
        res_last = await self.db.execute(q_last, params)
        ultima_atividade = res_last.scalar()

        return {
            "total_concluidos": total_concluidos,
            "total_defeitos": total_defeitos,
            "tempo_medio_minutos": 0.0,
            "total_fila": total_fila,
            "ultima_atividade": ultima_atividade
        }

    async def get_status_distribution(self, runner_id: Optional[int] = None) -> List[tuple]:
        where_clause = "WHERE responsavel_id = :rid" if runner_id else ""
        params = {"rid": runner_id} if runner_id else {}
        
        query = text(f"""
            SELECT status_geral, COUNT(*) 
            FROM execucoes_teste 
            {where_clause}
            GROUP BY status_geral
        """)
        result = await self.db.execute(query, params)
        return result.all()

    async def get_runner_timeline(self, runner_id: Optional[int] = None, limit: int = 10):
        # Aqui precisamos usar o select do ORM para trazer relacionamentos
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.testing import ExecucaoTeste
        
        stmt = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste),
                selectinload(ExecucaoTeste.responsavel)
            )
            .order_by(ExecucaoTeste.updated_at.desc())
            .limit(limit)
        )
        
        if runner_id:
            stmt = stmt.where(ExecucaoTeste.responsavel_id == runner_id)
            
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_ranking_runners(self, limit: int = 5) -> List[tuple]:
        query = text("""
            SELECT u.nome, COUNT(et.id) as total
            FROM usuarios u
            JOIN execucoes_teste et ON u.id = et.responsavel_id
            WHERE et.status_geral = 'passou' OR et.status_geral = 'falhou'
            GROUP BY u.nome
            ORDER BY total DESC
            LIMIT :limit
        """)
        result = await self.db.execute(query, {"limit": limit})
        return result.all()