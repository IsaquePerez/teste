from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.api import api_router
import os

os.makedirs("evidencias", exist_ok=True)
# Cria a aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuração do CORS (Cross-Origin Resource Sharing)
# Permite que o seu frontend (a correr em localhost:3000, etc.)
# comunique com o backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://testedocker-production-4e85.up.railway.app",
        "https://teste-docker.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui o roteador principal da v1, prefixando todas as suas rotas com /api/v1
app.mount("/evidencias", StaticFiles(directory="evidencias"), name="evidencias")
app.include_router(api_router, prefix=settings.API_V1_STR)
# Adiciona os endpoints básicos que você já tinha
@app.get("/", summary="Endpoint raiz da API")
def read_root():
    return {"message": "Backend conectado ao banco de dados gerenciado pelo Docker!"}

@app.get("/health", summary="Verifica a saúde da API")
def health_check():
    return {"status": "healthy"}