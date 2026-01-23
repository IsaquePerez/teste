from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str 
    nome: str
    role: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None # ID do usuário