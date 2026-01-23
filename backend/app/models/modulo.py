from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Modulo(Base):
    __tablename__ = "modulos"

    id = Column(Integer, primary_key=True, index=True)
    
    sistema_id = Column(Integer, ForeignKey("sistemas.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    descricao = Column(String(255))    
    ordem = Column(Integer)
    ativo = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('sistema_id', 'nome', name='uq_modulo_por_sistema'),
    )

    sistema = relationship("Sistema", back_populates="modulos")
    projetos = relationship("Projeto", back_populates="modulo")