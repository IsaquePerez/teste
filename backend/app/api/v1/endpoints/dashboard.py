from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse
from app.models.usuario import Usuario
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    sistema_id: Optional[int] = Query(None, description="Filtrar KPI por Sistema"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # --- CORREÇÃO AQUI ---
    # NÃO crie o repo aqui. O Service já faz isso internamente agora.
    service = DashboardService(db) 
    
    return await service.get_dashboard_data(sistema_id=sistema_id)