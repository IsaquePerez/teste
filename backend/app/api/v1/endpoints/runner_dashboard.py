from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.models.usuario import Usuario
from app.api.deps import get_current_active_user
from app.schemas.dashboard import RunnerDashboardResponse

router = APIRouter()

@router.get("/", response_model=RunnerDashboardResponse)
async def get_runner_dashboard(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db) 
):
    service = DashboardService(db)
    
    return await service.get_runner_dashboard_data(runner_id=current_user.id)