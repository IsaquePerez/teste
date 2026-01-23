from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.api import api_router
import os

os.makedirs("evidencias", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerenciador de ciclo de vida para lidar com operações assíncronas 
    durante o startup e shutdown da aplicação.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/evidencias", StaticFiles(directory="evidencias"), name="evidencias")
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", summary="Endpoint raiz da API")
def read_root():
    return {"message": "Backend conectado ao banco de dados gerenciado pelo Docker!"}

@app.get("/health", summary="Verifica a saúde da API")
def health_check():
    return {"status": "healthy"}