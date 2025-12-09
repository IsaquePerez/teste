from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: int | None = None
    POSTGRES_DB: str | None = None
    
    # URL principal (usada no Render/Neon)
    DATABASE_URL: str | None = None    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url_to_use = self.DATABASE_URL
        
        # Se não tiver URL completa, tenta montar com as parciais (fallback local)
        if not url_to_use:
            if not self.POSTGRES_HOST:
                # Segurança: se não tiver nada, usa SQLite em memória para não crashar o build
                return "sqlite+aiosqlite:///:memory:"
            
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        if "sslmode=require" in url_to_use:
            url_to_use = url_to_use.replace("sslmode=require", "ssl=require")

        # Garante o driver assíncrono
        if url_to_use.startswith("postgresql://"):
            return url_to_use.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url_to_use.startswith("postgres://"):
            return url_to_use.replace("postgres://", "postgresql+asyncpg://", 1)
        
        return url_to_use

    # Configurações gerais
    PROJECT_NAME: str = "Projeto GE"
    API_V1_STR: str = "/api/v1"

settings = Settings()