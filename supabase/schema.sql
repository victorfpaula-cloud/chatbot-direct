-- Chatbot Direct — schema inicial (Etapa 1)
-- Roda uma vez no SQL Editor do MESMO projeto Supabase que já hospeda o agendador-stories.
-- Todas as tabelas usam o prefixo chatbot_ e não tocam em nenhuma tabela existente do agendador.
-- RLS ativado sem policies públicas: leitura/escrita só via rotas server-side com a service role
-- key (mesmo padrão de segurança do agendador).

-- ============================================================================
-- Contas do Instagram conectadas a este sistema (conexão própria, separada do agendador)
-- ============================================================================
create table if not exists chatbot_accounts (
  id uuid primary key default gen_random_uuid(),
  instagram_user_id text not null unique,
  page_id text not null,
  page_name text,
  instagram_username text,
  access_token text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chatbot_accounts enable row level security;

-- ============================================================================
-- Configuração por conta: os 3 campos do "prompt de sistema" do Gemini + regras de reserva
-- ============================================================================
create table if not exists chatbot_account_settings (
  account_id uuid primary key references chatbot_accounts(id) on delete cascade,

  -- atendimento por IA (Gemini)
  base_conhecimento text not null default '',
  tom_de_voz text not null default '',
  guardrails text not null default '',

  -- gatilho da reserva (palavra-chave configurável, padrão "reserva")
  palavra_chave_reserva text not null default 'reserva',
  reserva_regras_texto text not null default '',
  google_sheet_id text,

  -- capacidade (soma de pessoas por data_reserva — ver chatbot_reservations)
  reserva_limite_normal integer not null default 50,
  reserva_limite_maximo integer not null default 60,

  -- cutoff: depois desse horário, não aceita reserva pra "hoje"
  reserva_cutoff_horario time not null default '17:00',

  -- pausa manual, sempre associada a uma data (nunca solta) — deixa de valer sozinha
  -- na virada do dia, sem precisar de rotina de "reset"
  reserva_pausa_ativa boolean not null default false,
  reserva_pausa_data date,
  reserva_pausa_mensagem text,

  updated_at timestamptz not null default now()
);

alter table chatbot_account_settings enable row level security;

-- ============================================================================
-- Palavras-chave especiais adicionais (além da reserva) — ex.: preço/promoção travados.
-- Cadastro dinâmico, sem teto fixo: cada linha é uma entrada da lista "+ adicionar palavra-chave".
-- ============================================================================
create table if not exists chatbot_keywords (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  palavra_chave text not null,
  mensagens jsonb not null default '[]'::jsonb, -- lista ordenada de strings
  pausa_entre_mensagens_ms integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists chatbot_keywords_account_idx on chatbot_keywords(account_id);

alter table chatbot_keywords enable row level security;

-- ============================================================================
-- Estado da conversa por cliente — o único lugar do sistema que guarda memória entre mensagens.
-- Usado pelo fluxo de reserva (e por qualquer outro fluxo com estado que surgir no futuro).
-- ============================================================================
create table if not exists chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  instagram_scoped_id text not null, -- id do cliente no Direct (IGSID)
  fluxo_atual text, -- ex: 'reserva', ou null se não está em nenhum fluxo
  etapa_atual text,
  dados_coletados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  unique (account_id, instagram_scoped_id)
);

alter table chatbot_conversations enable row level security;

-- ============================================================================
-- Reservas confirmadas — fonte de verdade rápida pras checagens de capacidade.
-- A planilha do Google continua sendo o registro visual, em paralelo (escrita síncrona na hora
-- da confirmação); esta tabela existe pra não precisar consultar a planilha a cada mensagem.
-- ============================================================================
create table if not exists chatbot_reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  data_reserva date not null,
  quantidade_pessoas integer not null,
  whatsapp text,
  confirmado_em timestamptz not null default now()
);

-- índice pensado pra query mais comum: soma de pessoas por conta+data
create index if not exists chatbot_reservations_account_data_idx
  on chatbot_reservations(account_id, data_reserva);

alter table chatbot_reservations enable row level security;

-- ============================================================================
-- Idempotência do webhook: evita processar/responder a mesma mensagem duas vezes
-- (a Meta pode reenviar o mesmo evento de webhook em caso de timeout/retry).
-- ============================================================================
create table if not exists chatbot_processed_messages (
  message_id text primary key,
  account_id uuid references chatbot_accounts(id) on delete cascade,
  processed_at timestamptz not null default now()
);

alter table chatbot_processed_messages enable row level security;

-- ============================================================================
-- Fluxo de conexão de conta via OAuth (mesmo padrão de duas tabelas já usado no agendador:
-- oauth_states pra validar o retorno do Facebook, pending_connections pra guardar as Páginas
-- disponíveis até o usuário escolher qual conectar).
-- ============================================================================
create table if not exists chatbot_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);

alter table chatbot_oauth_states enable row level security;

create table if not exists chatbot_pending_connections (
  id uuid primary key default gen_random_uuid(),
  fb_user_token text not null,
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table chatbot_pending_connections enable row level security;

-- ============================================================================
-- Etapas 3-6 — colunas que o código passou a usar depois deste schema inicial (personalização
-- das mensagens do fluxo de reserva, bloqueio de datas específicas, mensagem de limite máximo).
-- Ficaram faltando aqui mesmo já estando em uso em produção — o `add column if not exists` deixa
-- seguro rodar este arquivo inteiro de novo em qualquer ambiente, sem duplicar nem dar erro em
-- coluna que já existe.
-- ============================================================================
alter table chatbot_account_settings
  add column if not exists reserva_mensagem_limite_maximo text,
  add column if not exists reserva_msg_inicial text,
  add column if not exists reserva_msg_pergunta_data text,
  add column if not exists reserva_msg_pergunta_periodo text,
  add column if not exists reserva_msg_pergunta_pessoas text,
  add column if not exists reserva_msg_pergunta_whatsapp text,
  add column if not exists reserva_msg_confirmada text,
  add column if not exists reserva_msg_recusada text,
  add column if not exists reserva_datas_bloqueadas text;

-- ============================================================================
-- Liga/desliga a função de reservas por conta — nem toda página conectada vai usar reserva, então
-- ela nasce DESLIGADA (default false) e só liga quando o Victor aperta "Ativar reservas" na tela
-- de contas (/contas). Desligada, o webhook nunca entra no fluxo de reserva (mesmo que a
-- palavra-chave esteja configurada), a aba de configuração de reserva não mostra o formulário, e a
-- conta some do dropdown de contas em /reservas.
-- ============================================================================
alter table chatbot_account_settings
  add column if not exists reserva_habilitada boolean not null default false;

-- ============================================================================
-- Cache da foto de perfil de cada conta (tela /contas) — antes buscava direto na Meta a cada
-- abertura da tela; agora guarda aqui e só busca de novo quando estiver velha (ver
-- src/app/contas/page.tsx), já que a foto de perfil de um restaurante quase nunca muda.
-- ============================================================================
alter table chatbot_accounts
  add column if not exists foto_perfil_url text,
  add column if not exists foto_perfil_atualizada_em timestamptz;

-- ============================================================================
-- Reservas confirmadas — colunas que faltavam aqui (nome/@usuário do cliente, período, id do
-- cliente no Direct e se já foi sincronizada com a planilha do Google), todas já gravadas por
-- `finalizarReserva` em src/lib/reservas.ts.
-- ============================================================================
alter table chatbot_reservations
  add column if not exists instagram_scoped_id text,
  add column if not exists cliente_nome text,
  add column if not exists cliente_instagram_username text,
  add column if not exists periodo text,
  add column if not exists sheet_sincronizado boolean not null default false;

-- ============================================================================
-- Histórico de atendimentos (tela "Atendimentos" de cada conta) — usado desde a Etapa 3 em
-- src/lib/atendimentos.ts, mas nunca tinha entrado neste arquivo de schema.
-- ============================================================================
create table if not exists chatbot_atendimentos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  instagram_scoped_id text not null,
  cliente_nome text,
  cliente_username text,
  mensagem_recebida text,
  tipo_resposta text not null,
  resposta_enviada text,
  status text not null,
  erro_detalhe text,
  criado_em timestamptz not null default now()
);

create index if not exists chatbot_atendimentos_account_idx
  on chatbot_atendimentos(account_id, criado_em desc);

alter table chatbot_atendimentos enable row level security;

-- ============================================================================
-- Login dos funcionários do restaurante — tela "Funcionários" de cada conta (/contas/[id]/
-- funcionarios). Totalmente separado do login do Victor (Supabase Auth, ver src/middleware.ts):
-- aqui é usuário/senha simples, criado pelo próprio Victor pra cada pessoa que precisa acessar só
-- a tela de reservas do dia (/reservas), sem enxergar mais nada do painel administrativo.
--
-- `usuario` é único no sistema TODO (não só dentro da conta) — mantém a tela de login do
-- funcionário simples (só usuário + senha, sem precisar escolher "qual restaurante" antes).
-- ============================================================================
create table if not exists chatbot_funcionarios (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  usuario text not null unique,
  senha_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists chatbot_funcionarios_account_idx on chatbot_funcionarios(account_id);

alter table chatbot_funcionarios enable row level security;

-- Sessão do funcionário depois do login (token opaco guardado num cookie httpOnly) — mesmo
-- espírito de chatbot_oauth_states/chatbot_pending_connections (token guardado em texto puro,
-- protegido por só existir rota server-side com service role acessando essa tabela, nunca a
-- chave anônima). Excluir o funcionário (on delete cascade) já derruba a sessão dele na hora,
-- sem precisar de um campo "ativo" separado.
create table if not exists chatbot_funcionario_sessoes (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references chatbot_funcionarios(id) on delete cascade,
  token text not null unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);

create index if not exists chatbot_funcionario_sessoes_token_idx on chatbot_funcionario_sessoes(token);

-- ============================================================================
-- Cache do "total do ano" (reservas + pessoas) mostrado na tela /reservas — recalculado no
-- máximo uma vez por dia (na primeira visita do dia), não a cada carregamento de página: somar
-- o ano inteiro de novo em toda visita seria bem mais consulta no banco do que precisa pra um
-- número que só precisa estar certo "a partir de hoje", não em tempo real.
-- ============================================================================
create table if not exists chatbot_reservas_totais_anuais (
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  ano integer not null,
  total_reservas integer not null,
  total_pessoas integer not null,
  atualizado_em date not null,
  primary key (account_id, ano)
);

alter table chatbot_reservas_totais_anuais enable row level security;

alter table chatbot_funcionario_sessoes enable row level security;

-- ============================================================================
-- Log de alterações manuais em reservas (editar quantidade de pessoas, excluir) feitas direto na
-- tela /reservas — pelo Victor ou por um funcionário. Acessado só pelo Victor, em /reservas/log.
-- `reserva_id` NÃO é foreign key: precisa sobreviver mesmo depois que a reserva é excluída (é
-- exatamente o registro de "isso foi excluído"), então não pode ter `on delete cascade` puxando
-- o próprio log junto.
-- ============================================================================
create table if not exists chatbot_reservas_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  reserva_id uuid,
  cliente_nome text,
  autor text not null,
  acao text not null,
  detalhe text not null,
  criado_em timestamptz not null default now()
);

create index if not exists chatbot_reservas_log_account_idx
  on chatbot_reservas_log(account_id, criado_em desc);

alter table chatbot_reservas_log enable row level security;

-- ============================================================================
-- Lista de @usuários que o bot NUNCA deve responder (ex.: o próprio dono da conta) — cadastro
-- dinâmico por conta, mesmo padrão de chatbot_keywords (lista sem teto fixo, "+ adicionar").
-- Checado ANTES de processar qualquer mensagem: se o @usuário de quem mandou estiver aqui, o bot
-- ignora completamente (nem responde, nem registra em chatbot_atendimentos).
-- ============================================================================
create table if not exists chatbot_ignorados (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chatbot_accounts(id) on delete cascade,
  instagram_username text not null,
  nome text,
  created_at timestamptz not null default now(),
  unique (account_id, instagram_username)
);

create index if not exists chatbot_ignorados_account_idx on chatbot_ignorados(account_id);

alter table chatbot_ignorados enable row level security;
