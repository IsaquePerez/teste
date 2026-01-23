from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional

class NivelAcessoSimple(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UsuarioBase(BaseModel):
    nome: str
    username: Optional[str] = None
    email: EmailStr
    nivel_acesso_id: int
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    nivel_acesso_id: Optional[int] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None
    
    nivel_acesso: Optional[NivelAcessoSimple] = None
    
    model_config = ConfigDict(from_attributes=True)