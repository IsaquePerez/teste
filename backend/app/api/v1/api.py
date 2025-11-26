from fastapi import APIRouter
from .endpoints import login, sistemas, modulo, usuarios, metrica, projeto, teste, defeito

# Cria o roteador principal da API v1
api_router = APIRouter()

# Inclui o roteador de 'sistemas'
# Todas as rotas de 'sistemas.py' serão prefixadas com '/sistemas'
# e agrupadas sob a tag 'Sistemas' na documentação do Swagger
api_router.include_router(sistemas.router, prefix="/sistemas", tags=["Sistemas"])
api_router.include_router(modulo.router, prefix="/modulos", tags=["Módulos"])
api_router.include_router(projeto.router, prefix="/projetos", tags=["Projetos"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(metrica.router, prefix="/metricas", tags=["Métricas"])
api_router.include_router(login.router, prefix="/login", tags=["Login"])
api_router.include_router(teste.router, prefix="/testes", tags=["Testes"])
api_router.include_router(defeito.router, prefix="/defeitos", tags=["Defeitos"])