import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, text
from sqlalchemy.dialects.postgresql import JSONB 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class NivelAcessoEnum(str, enum.Enum):
    admin = "admin"
    user = "user"
    permissoes={}
class NivelAcesso(Base):
    __tablename__ = "niveis_acesso"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(Enum(NivelAcessoEnum, name='nivel_acesso_enum', create_type=False), nullable=False, unique=True)    
    descricao = Column(String(255))
    permissoes = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usuarios = relationship("Usuario", back_populates="nivel_acesso")