import shutil
import uuid
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_active_user
from app.models.usuario import Usuario
from app.models.testing import StatusExecucaoEnum

from app.services.caso_teste_service import CasoTesteService
from app.services.ciclo_teste_service import CicloTesteService
from app.services.execucao_teste_service import ExecucaoTesteService

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

# --- GESTÃO DE CASOS DE TESTE ---
@router.get("/projetos/{projeto_id}/casos", response_model=List[CasoTesteResponse])
async def listar_casos_projeto(
    projeto_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    # CORREÇÃO: Método correto é listar_casos_teste
    return await service.listar_casos_teste(projeto_id)

@router.post("/projetos/{projeto_id}/casos", response_model=CasoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_caso_teste(
    projeto_id: int,
    dados: CasoTesteCreate,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    if not dados.responsavel_id:
        dados.responsavel_id = current_user.id
        
    return await service.criar_caso_teste(projeto_id, dados)

@router.get("/casos/{caso_id}", response_model=CasoTesteResponse)
async def obter_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    # O Service já levanta 404 se não achar
    return await service.obter_caso_teste(caso_id)

@router.put("/casos/{caso_id}", response_model=CasoTesteResponse)
async def atualizar_caso_teste(
    caso_id: int,
    dados: CasoTesteUpdate,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    # CORREÇÃO: Método correto é atualizar_caso_teste
    return await service.atualizar_caso_teste(caso_id, dados)

@router.delete("/casos/{caso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    # CORREÇÃO: Método correto é deletar_caso_teste
    await service.deletar_caso_teste(caso_id)


# --- GESTÃO DE CICLOS DE TESTE ---
@router.get("/projetos/{projeto_id}/ciclos", response_model=List[CicloTesteResponse])
async def listar_ciclos_projeto(
    projeto_id: int,
    service: CicloTesteService = Depends(get_ciclo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.listar_por_projeto(projeto_id)

@router.post("/projetos/{projeto_id}/ciclos", response_model=CicloTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_ciclo(
    projeto_id: int,
    dados: CicloTesteCreate,
    service: CicloTesteService = Depends(get_ciclo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.criar_ciclo(projeto_id, dados)

@router.put("/ciclos/{ciclo_id}", response_model=CicloTesteResponse)
async def atualizar_ciclo(
    ciclo_id: int,
    dados: CicloTesteUpdate,
    service: CicloTesteService = Depends(get_ciclo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    ciclo = await service.atualizar_ciclo(ciclo_id, dados)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")
    return ciclo

@router.delete("/ciclos/{ciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ciclo(
    ciclo_id: int,
    service: CicloTesteService = Depends(get_ciclo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    sucesso = await service.remover_ciclo(ciclo_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

# --- EXECUÇÃO E PLANEJAMENTO ---
@router.post("/execucoes/", response_model=ExecucaoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_execucao(
    dados: ExecucaoTesteCreate,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.alocar_teste(dados.ciclo_teste_id, dados.caso_teste_id, dados.responsavel_id)

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
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.registrar_resultado_passo(passo_id, dados)

@router.put("/execucoes/{execucao_id}/finalizar")
async def finalizar_execucao_manual(
    execucao_id: int,
    status: StatusExecucaoEnum,
    service: ExecucaoTesteService = Depends(get_execucao_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    execucao = await service.finalizar_execucao(execucao_id, status_final=status)
    
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
        
    return {"message": "Execução atualizada", "status": status}

@router.post("/passos/{passo_id}/evidencia") 
async def upload_evidencia_passo(
    passo_id: int,
    file: UploadFile = File(...),
    service: ExecucaoTesteService = Depends(get_execucao_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.upload_evidencia(passo_id, file)

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