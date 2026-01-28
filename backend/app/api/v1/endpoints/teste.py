import shutil
import uuid
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_active_user
from app.models.usuario import Usuario
from app.models.projeto import Projeto
from app.models.modulo import Modulo
from app.models.testing import StatusExecucaoEnum, CicloTeste

from app.services.caso_teste_service import CasoTesteService
from app.services.ciclo_teste_service import CicloTesteService
from app.services.execucao_teste_service import ExecucaoTesteService
from app.services.log_service import LogService

from app.schemas.caso_teste import CasoTesteCreate, CasoTesteResponse, CasoTesteUpdate
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteResponse, CicloTesteUpdate
from app.schemas.execucao_teste import (
    ExecucaoTesteCreate, 
    ExecucaoTesteResponse, 
    ExecucaoPassoResponse, 
    ExecucaoPassoUpdate
)

router = APIRouter()

# --- DEPENDÊNCIAS DE SERVIÇO ---
def get_caso_service(db: AsyncSession = Depends(get_db)) -> CasoTesteService:
    return CasoTesteService(db)

def get_ciclo_service(db: AsyncSession = Depends(get_db)) -> CicloTesteService:
    return CicloTesteService(db)

def get_execucao_service(db: AsyncSession = Depends(get_db)) -> ExecucaoTesteService:
    return ExecucaoTesteService(db)

# --- HELPER PARA OBTER SISTEMA_ID ---
async def get_sistema_id_from_projeto(db: AsyncSession, projeto_id: int) -> Optional[int]:
    query = select(Projeto.sistema_id, Projeto.modulo_id).where(Projeto.id == projeto_id)
    result = await db.execute(query)
    projeto = result.first()
    
    if not projeto: return None
    if projeto.sistema_id: return projeto.sistema_id
        
    if projeto.modulo_id:
        query_mod = select(Modulo.sistema_id).where(Modulo.id == projeto.modulo_id)
        result_mod = await db.execute(query_mod)
        return result_mod.scalar()
    return None

# --- HELPER QUE FALTAVA ---
async def get_sistema_id_from_ciclo(db: AsyncSession, ciclo_id: int) -> Optional[int]:
    query = select(CicloTeste.projeto_id).where(CicloTeste.id == ciclo_id)
    result = await db.execute(query)
    projeto_id = result.scalar()
    
    if projeto_id:
        return await get_sistema_id_from_projeto(db, projeto_id)
    return None

# --- GESTÃO DE CASOS DE TESTE ---
@router.get("/casos", response_model=List[CasoTesteResponse])
async def listar_todos_casos(
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.listar_todos()

@router.get("/projetos/{projeto_id}/casos", response_model=List[CasoTesteResponse])
async def listar_casos_projeto(
    projeto_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.listar_casos_teste(projeto_id)

@router.post("/projetos/{projeto_id}/casos", response_model=CasoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_caso_teste(
    projeto_id: int,
    dados: CasoTesteCreate,
    service: CasoTesteService = Depends(get_caso_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if not dados.responsavel_id:
        dados.responsavel_id = current_user.id
        
    novo_caso = await service.criar_caso_teste(projeto_id, dados)
    
    sistema_id = await get_sistema_id_from_projeto(db, projeto_id)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="CasoTeste",
        entidade_id=novo_caso.id,
        sistema_id=sistema_id,
        detalhes=f"Criou o caso de teste '{novo_caso.nome}'"
    )

    return novo_caso

@router.get("/casos/{caso_id}", response_model=CasoTesteResponse)
async def obter_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.obter_caso_teste(caso_id)

@router.put("/casos/{caso_id}", response_model=CasoTesteResponse)
async def atualizar_caso_teste(
    caso_id: int,
    dados: CasoTesteUpdate,
    service: CasoTesteService = Depends(get_caso_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    caso = await service.atualizar_caso_teste(caso_id, dados)
    
    if caso:
        sistema_id = await get_sistema_id_from_projeto(db, caso.projeto_id)
        
        log_service = LogService(db)
        await log_service.registrar_acao(
            usuario_id=current_user.id,
            acao="ATUALIZAR",
            entidade="CasoTeste",
            entidade_id=caso.id,
            sistema_id=sistema_id,
            detalhes=f"Atualizou o caso de teste '{caso.nome}'"
        )

    return caso

@router.delete("/casos/{caso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    caso_antigo = await service.obter_caso_teste(caso_id)
    if not caso_antigo:
         raise HTTPException(status_code=404, detail="Caso de teste não encontrado")

    nome_caso = caso_antigo.nome
    projeto_id = caso_antigo.projeto_id
    sistema_id = await get_sistema_id_from_projeto(db, projeto_id)

    await service.deletar_caso_teste(caso_id)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="DELETAR",
        entidade="CasoTeste",
        entidade_id=caso_id,
        sistema_id=sistema_id,
        detalhes=f"Removeu o caso de teste '{nome_caso}'"
    )

# --- GESTÃO DE CICLOS DE TESTE ---
@router.get("/projetos/{projeto_id}/ciclos", response_model=List[CicloTesteResponse])
async def listar_ciclos_projeto(
    projeto_id: int,
    service: CicloTesteService = Depends(get_ciclo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.listar_por_projeto(projeto_id)

@router.get("/ciclos", response_model=List[CicloTesteResponse])
async def listar_todos_ciclos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user) 
):
    service = CicloTesteService(db)
    return await service.get_all_ciclos()

@router.post("/projetos/{projeto_id}/ciclos", response_model=CicloTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_ciclo(
    projeto_id: int,
    dados: CicloTesteCreate,
    service: CicloTesteService = Depends(get_ciclo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    novo_ciclo = await service.criar_ciclo(projeto_id, dados)
    
    sistema_id = await get_sistema_id_from_projeto(db, projeto_id)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="CicloTeste",
        entidade_id=novo_ciclo.id,
        sistema_id=sistema_id,
        detalhes=f"Criou o ciclo '{novo_ciclo.nome}'"
    )

    return novo_ciclo

@router.put("/ciclos/{ciclo_id}", response_model=CicloTesteResponse)
async def atualizar_ciclo(
    ciclo_id: int,
    dados: CicloTesteUpdate,
    service: CicloTesteService = Depends(get_ciclo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    ciclo = await service.atualizar_ciclo(ciclo_id, dados)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")
    
    sistema_id = await get_sistema_id_from_projeto(db, ciclo.projeto_id)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="CicloTeste",
        entidade_id=ciclo.id,
        sistema_id=sistema_id,
        detalhes=f"Atualizou o ciclo '{ciclo.nome}'"
    )

    return ciclo

@router.delete("/ciclos/{ciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ciclo(
    ciclo_id: int,
    service: CicloTesteService = Depends(get_ciclo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    ciclo = await service.obter_ciclo(ciclo_id)
    if not ciclo:
         raise HTTPException(status_code=404, detail="Ciclo não encontrado")
         
    sistema_id = await get_sistema_id_from_projeto(db, ciclo.projeto_id)
    nome_ciclo = ciclo.nome

    sucesso = await service.remover_ciclo(ciclo_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Erro ao remover ciclo")

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="DELETAR",
        entidade="CicloTeste",
        entidade_id=ciclo_id,
        sistema_id=sistema_id,
        detalhes=f"Removeu o ciclo '{nome_ciclo}'"
    )

# --- EXECUÇÃO E PLANEJAMENTO ---
@router.post("/execucoes/", response_model=ExecucaoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_execucao(
    dados: ExecucaoTesteCreate,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    nova_exec = await service.alocar_teste(dados.ciclo_teste_id, dados.caso_teste_id, dados.responsavel_id)
    sistema_id = await get_sistema_id_from_ciclo(db, dados.ciclo_teste_id)
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="ExecucaoTeste",
        entidade_id=nova_exec.id,
        sistema_id=sistema_id,
        detalhes=f"Alocou teste (Caso: {dados.caso_teste_id}, Ciclo: {dados.ciclo_teste_id})"
    )
    
    return nova_exec

@router.get("/minhas-tarefas", response_model=List[ExecucaoTesteResponse]) 
async def listar_meus_testes(
    status: Optional[StatusExecucaoEnum] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Usuario = Depends(get_current_user),
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.listar_tarefas_usuario(current_user.id, status, skip, limit)

@router.get("/execucoes/{execucao_id}", response_model=ExecucaoTesteResponse)
async def obter_execucao(
    execucao_id: int,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    execucao = await service.obter_execucao(execucao_id)
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução de teste não encontrada")
    return execucao
    
@router.put("/execucoes/passos/{passo_id}", response_model=ExecucaoPassoResponse)
async def registrar_passo(
    passo_id: int,
    dados: ExecucaoPassoUpdate,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    db: AsyncSession = Depends(get_db), 
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.registrar_resultado_passo(passo_id, dados)

@router.put("/execucoes/{execucao_id}/finalizar")
async def finalizar_execucao_manual(
    execucao_id: int,
    status: StatusExecucaoEnum,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    db: AsyncSession = Depends(get_db), 
    current_user: Usuario = Depends(get_current_active_user)
):
    execucao = await service.finalizar_execucao(execucao_id, status_final=status)
    
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
    sistema_id = None
    if execucao.ciclo_teste_id:
        sistema_id = await get_sistema_id_from_ciclo(db, execucao.ciclo_teste_id)
    status_str = status.value if hasattr(status, "value") else str(status)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="ExecucaoTeste",
        entidade_id=execucao_id,
        sistema_id=sistema_id,
        detalhes=f"Finalizou execução com status: {status_str}"
    )
        
    return {"message": "Execução atualizada", "status": status}

@router.post("/passos/{passo_id}/evidencia") 
async def upload_evidencia_passo(
    passo_id: int,
    file: UploadFile = File(...),
    service: ExecucaoTesteService = Depends(get_execucao_service),
    db: AsyncSession = Depends(get_db), 
    current_user: Usuario = Depends(get_current_active_user)
):
    resultado = await service.upload_evidencia(passo_id, file)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="PassoExecucao",
        entidade_id=passo_id,
        detalhes=f"Upload de evidência para o passo #{passo_id}"
    )

    return resultado

@router.get("/evidencias/download/{filename}")
async def download_evidencia(filename: str):
    file_path = f"evidencias/{filename}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='application/octet-stream' 
    )