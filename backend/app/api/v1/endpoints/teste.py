from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any, Optional

from app.core.database import get_db
from app.services.teste_service import TesteService

# Importando os Schemas corretos (agora separados)
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteResponse
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteResponse
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoUpdate, ExecucaoPassoResponse

from app.api.deps import get_current_user 
from app.models.testing import StatusExecucaoEnum

router = APIRouter()

# --- GESTÃO DE CASOS DE TESTE ---

@router.post("/projetos/{projeto_id}/casos", response_model=CasoTesteResponse, summary="Criar Caso de Teste")
async def criar_caso(
    projeto_id: int, 
    caso: CasoTesteCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo caso de teste com seus passos."""
    service = TesteService(db)
    return await service.criar_caso_teste(projeto_id, caso)

@router.get("/projetos/{projeto_id}/casos", response_model=List[CasoTesteResponse], summary="Listar Casos de Teste")
async def listar_casos(
    projeto_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Lista casos de teste de um projeto com paginação."""
    service = TesteService(db)
    # Acessando o repositório diretamente através do serviço para listagem simples
    return await service.repo.list_casos_by_projeto(projeto_id, skip, limit)

# --- GESTÃO DE CICLOS ---

@router.post("/projetos/{projeto_id}/ciclos", response_model=CicloTesteResponse, summary="Criar Ciclo de Teste")
async def criar_ciclo(
    projeto_id: int, 
    ciclo: CicloTesteCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo ciclo de testes (Sprint/Release)."""
    service = TesteService(db)
    return await service.criar_ciclo(projeto_id, ciclo)

@router.get("/projetos/{projeto_id}/ciclos", response_model=List[CicloTesteResponse], summary="Listar Ciclos")
async def listar_ciclos(
    projeto_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    service = TesteService(db)
    return await service.repo.list_ciclos_by_projeto(projeto_id, skip, limit)

# --- EXECUÇÃO DE TESTES (O dia a dia do QA) ---

@router.post("/alocar/{ciclo_id}/{caso_id}", response_model=ExecucaoTesteResponse, summary="Alocar Teste")
async def alocar_teste(
    ciclo_id: int,
    caso_id: int,
    responsavel_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """
    Cria uma instância de execução para um caso de teste dentro de um ciclo.
    Copia os passos do template para permitir o preenchimento individual.
    """
    service = TesteService(db)
    return await service.alocar_teste_para_execucao(ciclo_id, caso_id, responsavel_id)

@router.get("/minhas-tarefas", response_model=List[ExecucaoTesteResponse], summary="Minhas Execuções Pendentes")
async def minhas_tarefas(
    status: Optional[StatusExecucaoEnum] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user) 
):
    """Retorna a lista de testes que o usuário logado precisa executar."""
    user_id = current_user.id 
    service = TesteService(db)
    return await service.repo.get_minhas_execucoes(user_id, status, skip, limit)

@router.get("/execucoes/{execucao_id}", response_model=ExecucaoTesteResponse, summary="Detalhes da Execução")
async def ver_execucao(
    execucao_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retorna os detalhes completos de uma execução (incluindo os passos e status)."""
    service = TesteService(db)
    execucao = await service.repo.get_execucao_by_id(execucao_id)
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
    return execucao

@router.put("/passos/{execucao_passo_id}", response_model=ExecucaoPassoResponse, summary="Registrar Passo")
async def atualizar_passo(
    execucao_passo_id: int,
    dados: ExecucaoPassoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registra o resultado (Aprovado/Reprovado) de um passo específico.
    Se reprovar, pode atualizar automaticamente o status do teste pai.
    """
    service = TesteService(db)
    return await service.registrar_resultado_passo(execucao_passo_id, dados)

@router.put("/execucoes/{execucao_id}/finalizar", response_model=ExecucaoTesteResponse, summary="Finalizar Execução")
async def finalizar_execucao(
    execucao_id: int,
    status: StatusExecucaoEnum,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza o status final do teste (Ex: Passou, Falhou, Bloqueado)."""
    service = TesteService(db)
    return await service.finalizar_execucao(execucao_id, status)