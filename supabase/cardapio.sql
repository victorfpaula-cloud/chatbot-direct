-- Cardápio digital (módulo isolado). Só cria tabelas novas com prefixo cardapio_.
-- Não altera nem apaga nada existente. RLS ligado sem policies: só o servidor
-- (service role, criarClienteAdmin) lê e escreve, mesmo padrão do resto do projeto.

create table if not exists public.cardapio_contas (
  account_id     uuid primary key references public.chatbot_accounts(id) on delete cascade,
  habilitado     boolean not null default false,
  nome_exibicao  text not null default '',
  tagline        text not null default '',
  cor_destaque   text not null default '#e4572e',
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.cardapio_categorias (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.chatbot_accounts(id) on delete cascade,
  nome        text not null,
  descricao   text not null default '',
  posicao     integer not null default 0,
  ativa       boolean not null default true,
  capa_url    text not null default '',
  criado_em   timestamptz not null default now()
);
create index if not exists cardapio_categorias_conta_idx on public.cardapio_categorias (account_id, posicao);

create table if not exists public.cardapio_produtos (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.chatbot_accounts(id) on delete cascade,
  categoria_id      uuid not null references public.cardapio_categorias(id) on delete cascade,
  nome              text not null,
  descricao         text not null default '',
  preco_centavos    integer not null default 0,
  foto_url          text not null default '',
  tags              text[] not null default '{}',
  disponivel        boolean not null default true,
  posicao           integer not null default 0,
  criado_em         timestamptz not null default now()
);
create index if not exists cardapio_produtos_conta_idx on public.cardapio_produtos (account_id, categoria_id, posicao);

create table if not exists public.cardapio_destaques (
  id                          uuid primary key default gen_random_uuid(),
  account_id                  uuid not null references public.chatbot_accounts(id) on delete cascade,
  produto_id                  uuid not null references public.cardapio_produtos(id) on delete cascade,
  tipo                        text not null check (tipo in ('promo', 'destaque')),
  ate                         timestamptz not null,
  preco_promocional_centavos  integer,
  criado_em                   timestamptz not null default now()
);
create index if not exists cardapio_destaques_conta_idx on public.cardapio_destaques (account_id, tipo, ate);

alter table public.cardapio_contas enable row level security;
alter table public.cardapio_categorias enable row level security;
alter table public.cardapio_produtos enable row level security;
alter table public.cardapio_destaques enable row level security;
