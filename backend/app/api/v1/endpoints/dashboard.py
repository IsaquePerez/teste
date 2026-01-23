from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import DashboardResponse # <--- ADICIONADO DO MAIN

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    sistema_id: Optional[int] = Query(None, description="Filtrar KPI por Sistema"),
    db: AsyncSession = Depends(get_db)
):
    repo = DashboardRepository(db)
    service = DashboardService(repo)
    return await service.get_dashboard_data(sistema_id=sistema_id)