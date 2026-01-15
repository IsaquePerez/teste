from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional

from app.models.testing import Defeito, ExecucaoTeste, CasoTeste, ExecucaoPasso
from app.models.usuario import Usuario
from app.schemas.defeito import DefeitoCreate

class DefeitoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Helper pra não ficar repetindo essa query gigante de carregamento em todo lugar.
    def _get_load_options(self):
        return [
            # Traz a árvore completa: Defeito -> Execução -> Caso -> [Passos, Projeto, Ciclo]
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.projeto), # <--- CORREÇÃO CRÍTICA AQUI
                selectinload(CasoTeste.ciclo)    # <--- E AQUI TAMBÉM
            ),
            
            # Traz o ciclo da execução também, por segurança
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.ciclo),

            # Traz quem executou e o cargo
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
            
            # Traz o passo exato onde deu erro e o template dele
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
        ]

    async def create(self, dados: DefeitoCreate) -> Defeito:
        # 1. Blindagem: Evita criar dois bugs iguais (mesmo título na mesma execução) se ainda estiver aberto.
        query_existente = (
            select(Defeito)
            .options(*self._get_load_options()) 
            .where(
                Defeito.execucao_teste_id == dados.execucao_teste_id,
                Defeito.titulo == dados.titulo,
                Defeito.status != 'fechado'
            )
        )
        
        result = await self.db.execute(query_existente)
        defeito_existente = result.scalars().first()

        if defeito_existente:
            return defeito_existente

        # 2. Se não existe, cria um novo.
        novo_defeito = Defeito(**dados.model_dump())
        self.db.add(novo_defeito)
        await self.db.commit()
        
        # 3. Retorna o objeto novo já com todos os relacionamentos carregados (pra tela não quebrar).
        query_novo = (
            select(Defeito)
            .options(*self._get_load_options()) 
            .where(Defeito.id == novo_defeito.id)
        )
        result = await self.db.execute(query_novo)
        return result.scalars().first()

    # Lista tudo que deu errado nessa execução específica.
    async def get_by_execucao(self, execucao_id: int) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .options(*self._get_load_options()) # Adicionado options aqui também por segurança
            .where(Defeito.execucao_teste_id == execucao_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    # Atualiza dados do defeito e recarrega a árvore de dependências.
    async def update(self, id: int, dados: dict) -> Optional[Defeito]:
        defeito = await self.db.get(Defeito, id)
        if not defeito:
            return None
            
        for key, value in dados.items():
            setattr(defeito, key, value)
            
        await self.db.commit()
        
        # Reload completo para garantir consistência no frontend.
        query = (
            select(Defeito)
            .options(*self._get_load_options())
            .where(Defeito.id == id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    # Pega todos os defeitos, podendo filtrar por quem abriu (responsável da execução).
    async def get_all(self, responsavel_id: Optional[int] = None) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .join(Defeito.execucao)
            .options(*self._get_load_options())
            .order_by(Defeito.id.desc())
        )

        if responsavel_id:
            query = query.where(ExecucaoTeste.responsavel_id == responsavel_id)

        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete(self, id: int) -> bool:
        defeito = await self.db.get(Defeito, id)
        if defeito:
            await self.db.delete(defeito)
            await self.db.commit()
            return True
        return False