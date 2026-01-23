from pydantic_settings import BaseSettings, SettingsConfigDict
import re

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: int | None = None
    POSTGRES_DB: str | None = None
    
    DATABASE_URL: str | None = None
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        
        if not url:
            if not self.POSTGRES_HOST:
                return "sqlite+aiosqlite:///:memory:"
            
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        needs_ssl = "sslmode=require" in url

        url = re.sub(r'[?&]sslmode=[^&]+', '', url)
        url = re.sub(r'[?&]channel_binding=[^&]+', '', url)

        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        if needs_ssl:
            separator = "&" if "?" in url else "?"
            if "ssl=" not in url:
                url += f"{separator}ssl=require"

        return url

    PROJECT_NAME: str = "Projeto GE"
    API_V1_STR: str = "/api/v1"

settings = Settings()