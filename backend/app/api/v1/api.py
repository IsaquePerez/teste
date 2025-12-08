from fastapi import APIRouter
from .endpoints import login, sistemas, modulo, usuarios, metrica, projeto, teste, defeito, dashboard


api_router = APIRouter()

api_router.include_router(sistemas.router, prefix="/sistemas", tags=["Sistemas"])
api_router.include_router(modulo.router, prefix="/modulos", tags=["Módulos"])
api_router.include_router(projeto.router, prefix="/projetos", tags=["Projetos"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(metrica.router, prefix="/metricas", tags=["Métricas"])
api_router.include_router(login.router, prefix="/login", tags=["Login"])
api_router.include_router(teste.router, prefix="/testes", tags=["Testes"])
api_router.include_router(defeito.router, prefix="/defeitos", tags=["Defeitos"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])