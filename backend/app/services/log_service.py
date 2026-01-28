from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.log_repository import LogRepository
from app.schemas.log import LogCreate, LogResponse

class LogService:
    def __init__(self, db: AsyncSession):
        self.repo = LogRepository(db)

    async def registrar_acao(self, usuario_id: int, acao: str, entidade: str, entidade_id: int = None, detalhes: str = ""):
        dados = LogCreate(
            usuario_id=usuario_id,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            detalhes=detalhes
        )
        await self.repo.create(dados)

    async def listar_todos(self):
        logs = await self.repo.get_all(limit=200)
        return [
            LogResponse(
                id=l.id,
                usuario_nome=l.usuario.nome if l.usuario else "Sistema",
                acao=l.acao,
                entidade=l.entidade,
                detalhes=l.detalhes,
                created_at=l.created_at
            ) for l in logs
        ]

    async def excluir_log(self, id: int):
        return await self.repo.delete(id)