from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = DashboardService(db)
    return await service.get_dashboard_data()