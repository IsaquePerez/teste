from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.metrica_service import MetricaService

router = APIRouter()

@router.post("/gerar/{projeto_id}/{ciclo_id}", summary="Gerar Métricas do Ciclo")
async def gerar_metricas(
    projeto_id: int, 
    ciclo_id: int, 
    db: AsyncSession = Depends(get_db)
):
    service = MetricaService(db)
    return await service.gerar_metricas_execucao(projeto_id, ciclo_id)

@router.get("/projeto/{projeto_id}", summary="Listar métricas do projeto")
async def listar_metricas(
    projeto_id: int, 
    db: AsyncSession = Depends(get_db)
):
    service = MetricaService(db)
    return await service.listar_metricas_projeto(projeto_id)