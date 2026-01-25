CREATE TYPE nivel_acesso_enum AS ENUM ('admin', 'user');
CREATE TYPE status_projeto_enum AS ENUM ('ativo', 'pausado', 'finalizado');
CREATE TYPE status_ciclo_enum AS ENUM ('planejado', 'em_execucao', 'concluido', 'pausado', 'cancelado', 'erro');
CREATE TYPE prioridade_enum AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE tipo_metrica_enum AS ENUM ('cobertura', 'eficiencia', 'defeitos', 'qualidade', 'produtividade');
CREATE TYPE status_passo_enum AS ENUM ('pendente', 'aprovado', 'reprovado', 'bloqueado');
CREATE TYPE status_execucao_enum AS ENUM ('pendente', 'em_progresso', 'reteste', 'fechado', 'bloqueado');