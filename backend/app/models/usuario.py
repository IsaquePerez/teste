from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    
    nivel_acesso_id = Column(Integer, ForeignKey("niveis_acesso.id"), nullable=False)
    ativo = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    nivel_acesso = relationship("NivelAcesso", back_populates="usuarios")
    projetos_gerenciados = relationship("Projeto", back_populates="responsavel")
    execucoes_atribuidas = relationship("ExecucaoTeste", back_populates="responsavel")