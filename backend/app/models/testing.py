import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.usuario import Usuario

class PrioridadeEnum(str, enum.Enum):
    alta = "alta"
    media = "media"
    baixa = "baixa"

class StatusExecucaoEnum(str, enum.Enum):
    pendente = "pendente"
    em_progresso = "em_progresso"
    reteste = "reteste"
    fechado = "fechado"
    bloqueado = "bloqueado" 

class StatusPassoEnum(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    reprovado = "reprovado"
    bloqueado = "bloqueado"

class StatusCicloEnum(str, enum.Enum):
    planejado = "planejado"
    em_execucao = "em_execucao"
    concluido = "concluido"
    pausado = "pausado"
    cancelado = "cancelado"
    erro = "erro"

class StatusDefeitoEnum(str, enum.Enum):
    aberto = "aberto"
    em_teste = "em_teste"
    corrigido = "corrigido"
    fechado = "fechado"

class SeveridadeDefeitoEnum(str, enum.Enum):
    critico = "critico"
    alto = "alto"
    medio = "medio"
    baixo = "baixo"

class StatusCasoTesteEnum(str, enum.Enum):
    rascunho = "rascunho"   
    ativo = "ativo"           
    obsoleto = "obsoleto"     
    revisao = "revisao"       

# Ciclos de Teste
class CicloTeste(Base):
    __tablename__ = "ciclos_teste"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    
    numero = Column(Integer) 
    descricao = Column(Text)
    
    data_inicio = Column(DateTime(timezone=True))
    data_fim = Column(DateTime(timezone=True))
    status = Column(Enum(StatusCicloEnum, name='status_ciclo_enum', create_type=False), default=StatusCicloEnum.planejado)    
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('projeto_id', 'nome', name='uq_ciclo_nome_projeto'),
    )

    projeto = relationship("Projeto", back_populates="ciclos")
    execucoes = relationship("ExecucaoTeste", back_populates="ciclo", cascade="all, delete-orphan")
    metricas = relationship("Metrica", back_populates="ciclo")
    
    # Relacionamento inverso para acessar os casos planejados neste ciclo
    casos = relationship("CasoTeste", back_populates="ciclo")

    @property
    def total_testes(self):
        return len(self.execucoes) if self.execucoes else 0

    @property
    def testes_concluidos(self):
        if not self.execucoes:
            return 0
        # CORRIGIDO: Agora conta apenas 'fechado' (já que passou/falhou sumiram)
        return sum(1 for e in self.execucoes if e.status_geral == StatusExecucaoEnum.fechado)
    
class CasoTeste(Base):
    __tablename__ = "casos_teste"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Campo que faltava e causava o erro
    ciclo_id = Column(Integer, ForeignKey("ciclos_teste.id"), nullable=True)
    
    nome = Column(String(255), nullable=False)
    
    descricao = Column(Text)
    pre_condicoes = Column(Text)
    criterios_aceitacao = Column(Text) 
    prioridade = Column(Enum(PrioridadeEnum, name='prioridade_enum', create_type=False), default=PrioridadeEnum.media)
    status = Column(Enum(StatusCasoTesteEnum, name='status_caso_teste_enum', create_type=False), default=StatusCasoTesteEnum.rascunho)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('projeto_id', 'nome', name='uq_casoteste_nome_projeto'),
    )

    projeto = relationship("Projeto", back_populates="casos_teste")
    responsavel = relationship("Usuario")   
    
    # Relacionamento com Ciclo
    ciclo = relationship("CicloTeste", back_populates="casos")
    
    passos = relationship("PassoCasoTeste", back_populates="caso_teste", cascade="all, delete-orphan", order_by="PassoCasoTeste.ordem")
    execucoes = relationship("ExecucaoTeste", back_populates="caso_teste")

class PassoCasoTeste(Base):
    __tablename__ = "passos_caso_teste"

    id = Column(Integer, primary_key=True, index=True)
    caso_teste_id = Column(Integer, ForeignKey("casos_teste.id"), nullable=False)
    
    ordem = Column(Integer, nullable=False)
    acao = Column(Text, nullable=False)
    resultado_esperado = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('caso_teste_id', 'ordem', name='uq_passo_ordem'),
    )

    caso_teste = relationship("CasoTeste", back_populates="passos")
    execucoes_deste_passo = relationship("ExecucaoPasso", back_populates="passo_template")

class ExecucaoTeste(Base):
    __tablename__ = "execucoes_teste"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_teste_id = Column(Integer, ForeignKey("ciclos_teste.id"), nullable=False)
    caso_teste_id = Column(Integer, ForeignKey("casos_teste.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"))
    
    status_geral = Column(Enum(StatusExecucaoEnum, name='status_execucao_enum', create_type=False), default=StatusExecucaoEnum.pendente)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    ciclo = relationship("CicloTeste", back_populates="execucoes")
    caso_teste = relationship("CasoTeste", back_populates="execucoes")
    responsavel = relationship("Usuario", back_populates="execucoes_atribuidas")
    
    passos_executados = relationship("ExecucaoPasso", back_populates="execucao_pai", cascade="all, delete-orphan", order_by="ExecucaoPasso.id")
    defeitos = relationship("Defeito", back_populates="execucao", cascade="all, delete-orphan")

class ExecucaoPasso(Base):
    __tablename__ = "execucoes_passos"

    id = Column(Integer, primary_key=True, index=True)
    execucao_teste_id = Column(Integer, ForeignKey("execucoes_teste.id"), nullable=False)
    passo_caso_teste_id = Column(Integer, ForeignKey("passos_caso_teste.id"), nullable=False)
    
    resultado_obtido = Column(Text)
    status = Column(Enum(StatusPassoEnum, name='status_passo_enum', create_type=False), default=StatusPassoEnum.pendente)
    evidencias = Column(Text) 
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    execucao_pai = relationship("ExecucaoTeste", back_populates="passos_executados")
    passo_template = relationship("PassoCasoTeste", back_populates="execucoes_deste_passo")

class Defeito(Base):
    __tablename__ = "defeitos"

    id = Column(Integer, primary_key=True, index=True)
    execucao_teste_id = Column(Integer, ForeignKey("execucoes_teste.id"), nullable=False)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=False)    
    evidencias = Column(Text)
    logs_erro = Column(Text, nullable=True) 
    severidade = Column(Enum(SeveridadeDefeitoEnum, name='severidade_defeito_enum', create_type=False), nullable=False)
    status = Column(Enum(StatusDefeitoEnum, name='status_defeito_enum', create_type=False), default=StatusDefeitoEnum.aberto)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    execucao = relationship("ExecucaoTeste", back_populates="defeitos")