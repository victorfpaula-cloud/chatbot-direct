# Chatbot Direct

Sistema próprio de atendimento automático de Instagram Direct — substitui o SendPulse para uso
pessoal do Victor. Projeto irmão do
[agendador-stories](https://agendador-stories2.vercel.app), totalmente separado (código, deploy,
cadastro na Meta), mas reaproveitando o **mesmo projeto Supabase** (tabelas com prefixo
`chatbot_`, sem tocar nas tabelas do agendador).

Stack: Next.js 14 (App Router, TypeScript) + Tailwind + Supabase (Postgres) + Meta Graph API
(Instagram messaging) + Gemini (atendimento por IA).

## Estado atual: funcionando numa conta de teste, com melhorias pendentes

Todas as etapas abaixo já estão implementadas em código e em uso numa conta de teste — falta
ainda o App Review da Meta pra abrir pra contas de verdade fora do modo de desenvolvimento.

- **Webhook** (`src/app/api/webhook/instagram/route.ts`): confere o handshake de verificação da
  Meta, valida a assinatura de cada chamada (`X-Hub-Signature-256`), evita processar a mesma
  mensagem duas vezes (`chatbot_processed_messages`) e roteia pro fluxo de reserva, palavra-chave
  ou Gemini, registrando tudo em `chatbot_atendimentos`.
- **Conexão de conta** (`/contas`, `/contas/conectar`, `src/lib/facebookOAuth.ts`): login via
  Facebook Login, lista as Páginas com Instagram vinculado, deixa escolher qual conectar e já
  inscreve a Página no webhook automaticamente. Falta ainda **adicionar a URL de redirecionamento
  do OAuth (`/api/auth/facebook/callback`) nas configurações de "Login do Facebook para Empresas"
  do app do chatbot no painel do Meta** — sem isso o Facebook recusa o redirecionamento na volta
  do login, e é o item que bloqueia o App Review.
- **Atendimento por IA (Gemini)**, **palavras-chave especiais** e **fluxo de reserva completo**
  (capacidade, cutoff de horário, pausa manual, bloqueio de datas específicas, mensagens
  personalizáveis por conta, planilha do Google) já implementados — ver `src/lib/gemini.ts`,
  `src/lib/reservas.ts` e as abas em `/contas/[id]`.

- **Login** (`/login`, `src/middleware.ts`): protege `/contas` e toda rota de API que muda ou lê
  dado de conta/cliente. Mesmo padrão de sessão via Supabase Auth (cookie) já usado no
  agendador-stories e no ShoppingHub — inclusive o mesmo usuário cadastrado lá já funciona aqui,
  sem precisar criar nada novo, porque os três projetos usam o mesmo projeto Supabase. Fica de
  fora só `/api/webhook/instagram` (quem chama é a Meta, validado por assinatura HMAC própria).
- **Painel de reservas** (`/reservas`, `src/app/contas/[id]/funcionarios`): tela pro dia a dia do
  restaurante — reservas confirmadas agrupadas por dia e período, com o total de pessoas contra a
  capacidade configurada. Pensada pra substituir a planilha do Google + Looker Studio que o
  Victor usa hoje só pra isso. Tem duas portas de entrada: a sessão normal (Victor, dono da
  conta, vê todas as contas com um seletor) e um login próprio e separado pra funcionário do
  restaurante (`chatbot_funcionarios`/`chatbot_funcionario_sessoes`, ver
  `src/lib/funcionarios.ts`), criado pelo Victor na aba "Funcionários" de cada conta — quem entra
  por ali só enxerga essa tela, nada mais do painel.

## Como rodar (visão geral, não precisa fazer isso localmente)

1. `npm install`
2. Copiar `.env.example` para `.env.local` e preencher com os valores reais (Supabase, Meta,
   Gemini) — nunca commitar o `.env.local`.
3. `npm run dev`

Na Vercel, as mesmas variáveis de ambiente vão em Project Settings → Environment Variables.

## Banco de dados

O schema das tabelas novas está em `supabase/schema.sql` — rodar uma vez no SQL Editor do mesmo
projeto Supabase que já hospeda o agendador. Todas as tabelas usam o prefixo `chatbot_` e RLS
ativado sem policies públicas (mesmo padrão de segurança do agendador — leitura/escrita só via
rotas server-side com a chave de service role).

## Próximas etapas (ver plano completo no projeto "Agendamento Stories" no Claude)

1. ~~Infraestrutura base (este commit)~~
2. Webhook mínimo + conexão de 1 conta via OAuth
3. Atendimento por IA (Gemini) com base de conhecimento, tom de voz e guardrails configuráveis
4. Palavras-chave especiais (gatilho de reserva, e o que mais for preciso)
5. Fluxo de reserva completo (capacidade, cutoff de horário, pausa manual, planilha do Google)
6. Migração das contas do SendPulse, uma de cada vez
