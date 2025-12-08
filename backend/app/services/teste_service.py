from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from datetime import datetime

# Repositórios
from app.repositories.teste_repository import TesteRepository
from app.repositories.usuario_repository import UsuarioRepository

# Schemas
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteUpdate
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteUpdate
from app.schemas.execucao_teste import ExecucaoPassoUpdate

# Models e Enums
from app.models.testing import (
    StatusExecucaoEnum, StatusPassoEnum, 
    StatusCicloEnum, CicloTeste
)

class TesteService:
    def __init__(self, db: AsyncSession):
        self.repo = TesteRepository(db)
        self.user_repo = UsuarioRepository(db)
    
    # --- HELPERS INTERNOS ---

    async def _validar_usuario_ativo(self, usuario_id: int):
        if not usuario_id: return
        user = await self.user_repo.get_usuario_by_id(usuario_id)
        if not user or not user.ativo:
            raise HTTPException(status_code=400, detail="O utilizador selecionado está INATIVO e não pode receber tarefas.")
    
    async def _atualizar_ciclo_para_execucao(self, ciclo_id: int):
        """
        Verifica se o ciclo está 'planejado'. Se sim, muda para 'em_execucao'.
        Chamado sempre que um teste é alocado (criado ou vinculado).
        """
        # Acesso direto ao DB via repositório para buscar o objeto simples
        ciclo = await self.repo.db.get(CicloTeste, ciclo_id)
        
        if ciclo and ciclo.status == StatusCicloEnum.planejado:
            print(f"--- AUTO-UPDATE: Ciclo {ciclo_id} mudou para EM_EXECUCAO ---")
            await self.repo.update_ciclo(
                ciclo_id, 
                {"status": StatusCicloEnum.em_execucao}
            )

    async def _verificar_conclusao_ciclo(self, ciclo_id: int):
        """
        Verifica se ainda existem testes pendentes no ciclo.
        Se NÃO houver (tudo passou/falhou/bloqueou), marca o ciclo como 'concluido'.
        """
        tem_pendencia = await self.repo.verificar_pendencias_ciclo(ciclo_id)
        
        if not tem_pendencia:
            print(f"--- AUTO-UPDATE: Ciclo {ciclo_id} concluído automaticamente ---")
            await self.repo.update_ciclo(ciclo_id, {"status": StatusCicloEnum.concluido})

    # --- GESTÃO DE CASOS DE TESTE ---

    async def criar_caso_teste(self, projeto_id: int, dados: CasoTesteCreate):
        # 1. Validação de Duplicidade (Nome único no projeto)
        existente = await self.repo.get_caso_by_nome_projeto(dados.nome, projeto_id)
        if existente:
             raise HTTPException(status_code=400, detail="Já existe um Caso de Teste com este nome neste projeto.")

        # 2. Validação do Responsável
        if dados.responsavel_id:
            await self._validar_usuario_ativo(dados.responsavel_id)

        # 3. Criação do Caso
        novo_caso = await self.repo.create_caso_teste(projeto_id, dados)

        # 4. Alocação Automática (Se vier com ciclo e responsável)
        if dados.ciclo_id and dados.responsavel_id:
            await self.repo.criar_planejamento_execucao(
                ciclo_id=dados.ciclo_id,
                caso_id=novo_caso.id,
                responsavel_id=dados.responsavel_id
            )
            # AQUI ESTAVA FALTANDO: Atualizar status do ciclo
            await self._atualizar_ciclo_para_execucao(dados.ciclo_id)
            
        return novo_caso
    
    async def atualizar_caso(self, caso_id: int, dados: CasoTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)

        if 'responsavel_id' in update_data and update_data['responsavel_id']:
             await self._validar_usuario_ativo(update_data['responsavel_id'])
        
        return await self.repo.update_caso_teste(caso_id, update_data)

    async def remover_caso(self, caso_id: int):
        return await self.repo.delete_caso_teste(caso_id)

    # --- GESTÃO DE CICLOS ---

    async def criar_ciclo(self, projeto_id: int, dados: CicloTesteCreate):
        # 1. Validação de Duplicidade
        existente = await self.repo.get_ciclo_by_nome_projeto(dados.nome, projeto_id)
        if existente:
             raise HTTPException(status_code=400, detail="Já existe um Ciclo com este nome neste projeto.")
        
        # 2. Validação de Data
        if dados.data_inicio:
            hoje = datetime.now().date()
            inicio = dados.data_inicio.date()
            if inicio < hoje:
                raise HTTPException(status_code=400, detail="A data de início do ciclo não pode ser no passado.")
                
        return await self.repo.create_ciclo(projeto_id, dados)
    
    async def atualizar_ciclo(self, ciclo_id: int, dados: CicloTesteUpdate):
        update_data = dados.model_dump(exclude_unset=True)
        
        # Regra de Negócio: Não pode voltar para 'planejado' se já tiver execução
        # (Depende de você ter implementado has_execucoes_by_ciclo no repo, senão remova este bloco)
        if 'status' in update_data and update_data['status'] == StatusCicloEnum.planejado:
             # Assumindo que você tem ou vai criar este método no repo
             # tem_execucoes = await self.repo.has_execucoes_by_ciclo(ciclo_id)
             # if tem_execucoes:
             #    raise HTTPException(status_code=400, detail="Ciclo com execuções não pode voltar para Planejado.")
             pass 

        return await self.repo.update_ciclo(ciclo_id, update_data)

    async def remover_ciclo(self, ciclo_id: int):
        return await self.repo.delete_ciclo(ciclo_id)
    
    # --- EXECUÇÃO DE TESTES ---

    async def alocar_teste_para_execucao(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        """
        Aloca um teste existente para um ciclo.
        """
        await self._validar_usuario_ativo(responsavel_id)

        nova_execucao = await self.repo.criar_planejamento_execucao(ciclo_id, caso_id, responsavel_id)
        
        # Atualiza status do ciclo
        await self._atualizar_ciclo_para_execucao(ciclo_id)

        return nova_execucao

    async def listar_tarefas_usuario(self, usuario_id: int):
        return await self.repo.get_minhas_execucoes(usuario_id)

    async def registrar_resultado_passo(self, execucao_passo_id: int, dados: ExecucaoPassoUpdate):
        passo_atualizado = await self.repo.update_execucao_passo(execucao_passo_id, dados)
        
        if not passo_atualizado:
            raise HTTPException(status_code=404, detail="Passo de execução não encontrado")

        # Automação: Se passo falhar/bloquear, o teste todo falha/bloqueia
        status_novo = None
        if dados.status == StatusPassoEnum.reprovado:
            status_novo = StatusExecucaoEnum.falhou
        elif dados.status == StatusPassoEnum.bloqueado:
            status_novo = StatusExecucaoEnum.bloqueado
            
        if status_novo:
            await self.repo.update_status_geral_execucao(
                passo_atualizado.execucao_teste_id, 
                status_novo
            )
            
            # Verifica se o ciclo acabou (já que o teste finalizou com falha)
            execucao = await self.repo.get_execucao_by_id(passo_atualizado.execucao_teste_id)
            if execucao:
                await self._verificar_conclusao_ciclo(execucao.ciclo_teste_id)
            
        return passo_atualizado

    async def finalizar_execucao(self, execucao_id: int, status: StatusExecucaoEnum):
        # Atualiza status manual (ex: Passou)
        execucao = await self.repo.update_status_geral_execucao(execucao_id, status)
        
        # Verifica se o ciclo acabou
        if execucao:
            await self._verificar_conclusao_ciclo(execucao.ciclo_teste_id)
            
        return execucao