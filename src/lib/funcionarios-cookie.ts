import type { criarClienteAdmin } from "./supabase/admin";

// Nome do cookie de sessão, separado de src/lib/funcionarios.ts de propósito: o middleware (que
// roda em Edge Runtime, sem `node:crypto`) importa daqui, nunca o hash/verificação de senha — que
// fica em funcionarios.ts e só roda em rota normal (Node.js). A validação de sessão abaixo também
// mora aqui pelo mesmo motivo: é só uma consulta ao banco (mais, agora, HMAC via Web Crypto — API
// global, disponível tanto no Edge quanto no Node, ao contrário de `node:crypto`), então roda
// igual tanto no middleware (Edge) quanto nas páginas normais (Node.js).
export const NOME_DO_COOKIE_DE_SESSAO = "chatbot_funcionario_sessao";

// "Carimbo de confiança": combinado com o Victor (10/09) — não precisa reconferir no banco TODA
// vez que o app abre, só de vez em quando. Depois de uma confirmação de verdade no banco, guarda
// um comprovante assinado (HMAC, não dá pra forjar sem o segredo do servidor) num cookie separado,
// e enquanto esse comprovante não vencer, o middleware confia nele em vez de consultar o banco de
// novo — corta o maior gargalo antes da splash aparecer (ver SplashReservas.tsx).
// Trade-off aceito de propósito: se a conta for pausada nesse meio-tempo, quem já tem um carimbo
// válido continua acessando até ele vencer (no máximo essa janela), em vez de ser cortado na
// mesma hora como era antes. Pra reduzir isso, é só diminuir JANELA_DE_CONFIANCA_MS.
export const NOME_DO_COOKIE_DE_VERIFICACAO = "chatbot_funcionario_verificado";
// Nome do header que o middleware usa pra repassar o carimbo já lido/gerado pra tela de reservas
// (ver PainelDeReservas.tsx) — evita ela consultar o banco de novo só pra saber a conta/usuário.
export const NOME_DO_HEADER_DE_CARIMBO = "x-funcionario-carimbo";
const JANELA_DE_CONFIANCA_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Carimbo SEPARADO (mais curto) só pra "a conta ainda está ativa" — combinado com o Victor:
// pausar por falta de pagamento precisa cortar o acesso da equipe em até 1 minuto, bem mais cedo
// que os 7 dias do carimbo de identidade acima. Antes essa checagem rodava direto na página
// (PainelDeReservas.tsx) a CADA navegação, sem cache — lento (uma consulta a mais no banco em
// todo clique) e, pior, uma falha passageira nessa consulta (rede/timeout) derrubava a pessoa pro
// login na hora, parecendo um bug de "desloga sozinho". Com esse carimbo curto, a consulta de
// verdade só acontece de novo quando ele vence (no máximo a cada 45s), e uma falha na consulta não
// desloga ninguém (ver middleware.ts) — só adia a próxima checagem.
export const NOME_DO_COOKIE_DE_CONTA_ATIVA = "chatbot_funcionario_conta_ativa";
const JANELA_DE_CONTA_ATIVA_MS = 45 * 1000; // 45s — dentro do "até 1 minuto" combinado.

export type ContaDoFuncionario = {
  contaId: string;
  pageName: string;
  username: string | null;
  usuario: string;
};

export type ResultadoDaSessaoDeFuncionario =
  | { valida: true; dados: ContaDoFuncionario }
  | { valida: false; motivo: "sem_sessao" | "conta_pausada" };

/**
 * Confere se o token do cookie é uma sessão de funcionário válida E se a conta dele ainda está
 * ativa — pausar a conta (botão "Pausar" em /contas) já corta o acesso da equipe também, sem
 * precisar excluir ninguém nem mexer em mais nada além do botão que já existia. Usado tanto pelo
 * middleware (pra decidir se deixa passar) quanto por /reservas (pra saber por que recusou).
 * Consulta de verdade no banco — é o caminho "lento" que o carimbo de confiança evita repetir a
 * cada abertura do app.
 */
export async function validarSessaoDeFuncionario(
  admin: ReturnType<typeof criarClienteAdmin>,
  token: string | undefined
): Promise<ResultadoDaSessaoDeFuncionario> {
  if (!token) return { valida: false, motivo: "sem_sessao" };

  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select(
      "expira_em, chatbot_funcionarios(usuario, chatbot_accounts(id, page_name, instagram_username, active))"
    )
    .eq("token", token)
    .maybeSingle();

  if (!sessao || new Date(sessao.expira_em).getTime() <= Date.now()) {
    return { valida: false, motivo: "sem_sessao" };
  }

  const funcionario = (sessao as any).chatbot_funcionarios;
  const conta = funcionario?.chatbot_accounts;
  if (!conta?.active) {
    return { valida: false, motivo: "conta_pausada" };
  }

  return {
    valida: true,
    dados: {
      contaId: conta.id,
      pageName: conta.page_name,
      username: conta.instagram_username ?? null,
      usuario: funcionario.usuario,
    },
  };
}

const codificadorDeTexto = new TextEncoder();

async function obterChaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    codificadorDeTexto.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function paraBase64Url(bytes: ArrayBuffer): string {
  let binario = "";
  for (const b of new Uint8Array(bytes)) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(valor: string): Uint8Array {
  const normalizado = valor.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = normalizado + "=".repeat((4 - (normalizado.length % 4)) % 4);
  const binario = atob(preenchido);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

// Comparação em tempo constante — mesmo motivo do `crypto.timingSafeEqual` já usado em
// metaMessaging.ts, só que essa versão roda no Edge Runtime também (`timingSafeEqual` é
// `node:crypto`, não disponível aqui).
function assinaturasIguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

async function assinar(payloadTexto: string, segredo: string): Promise<string> {
  const chave = await obterChaveHmac(segredo);
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificadorDeTexto.encode(payloadTexto));
  return paraBase64Url(assinatura);
}

/**
 * Gera o carimbo assinado logo depois de uma confirmação de verdade no banco — guarda o token da
 * sessão (pra invalidar sozinho se a pessoa deslogar e logar nutra conta depois), os dados da
 * conta (evita uma SEGUNDA consulta ao banco lá na página, ver resolverContaDoFuncionario em
 * PainelDeReservas.tsx) e o instante da verificação.
 */
export async function criarCarimboDeVerificacao(
  token: string,
  dados: ContaDoFuncionario,
  segredo: string
): Promise<string> {
  const payloadTexto = paraBase64Url(
    codificadorDeTexto.encode(
      JSON.stringify({ t: token, c: dados.contaId, p: dados.pageName, u: dados.username, n: dados.usuario, v: Date.now() })
    ).buffer
  );
  const assinatura = await assinar(payloadTexto, segredo);
  return `${payloadTexto}.${assinatura}`;
}

/**
 * Confere o carimbo sem tocar no banco: assinatura bate (não foi forjado/alterado), é pro MESMO
 * token que está no cookie de sessão agora (invalida sozinho se a pessoa deslogou e outra logou
 * no mesmo aparelho depois) e ainda está dentro da janela de confiança. Qualquer coisa fora disso
 * devolve `null` e quem chamou cai de volta pra `validarSessaoDeFuncionario` (consulta de verdade).
 */
export async function lerCarimboDeVerificacao(
  carimbo: string | undefined,
  tokenEsperado: string | undefined,
  segredo: string | undefined
): Promise<ContaDoFuncionario | null> {
  if (!carimbo || !tokenEsperado || !segredo) return null;

  const partes = carimbo.split(".");
  if (partes.length !== 2) return null;
  const [payloadTexto, assinaturaRecebida] = partes;

  const assinaturaEsperada = await assinar(payloadTexto, segredo);
  if (!assinaturasIguais(assinaturaEsperada, assinaturaRecebida)) return null;

  let payload: { t?: string; c?: string; p?: string; u?: string | null; n?: string; v?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(deBase64Url(payloadTexto)));
  } catch {
    return null;
  }

  if (payload.t !== tokenEsperado) return null;
  if (typeof payload.v !== "number" || Date.now() - payload.v > JANELA_DE_CONFIANCA_MS) return null;
  if (!payload.c || !payload.p || !payload.n) return null;

  return { contaId: payload.c, pageName: payload.p, username: payload.u ?? null, usuario: payload.n };
}

/** Gera o carimbo curto de "conta ativa" (ver NOME_DO_COOKIE_DE_CONTA_ATIVA acima), logo depois de
 * confirmar `active = true` no banco. */
export async function criarCarimboDeContaAtiva(contaId: string, segredo: string): Promise<string> {
  const payloadTexto = paraBase64Url(
    codificadorDeTexto.encode(JSON.stringify({ c: contaId, v: Date.now() })).buffer
  );
  const assinatura = await assinar(payloadTexto, segredo);
  return `${payloadTexto}.${assinatura}`;
}

/** Confere o carimbo curto de "conta ativa" sem tocar no banco: assinatura bate, é pra MESMA
 * conta e ainda está dentro da janela de ~45s. Fora disso, `false` — quem chamou decide se vale a
 * pena consultar o banco de novo (ver middleware.ts). */
export async function lerCarimboDeContaAtiva(
  carimbo: string | undefined,
  contaIdEsperada: string,
  segredo: string | undefined
): Promise<boolean> {
  if (!carimbo || !segredo) return false;

  const partes = carimbo.split(".");
  if (partes.length !== 2) return false;
  const [payloadTexto, assinaturaRecebida] = partes;

  const assinaturaEsperada = await assinar(payloadTexto, segredo);
  if (!assinaturasIguais(assinaturaEsperada, assinaturaRecebida)) return false;

  let payload: { c?: string; v?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(deBase64Url(payloadTexto)));
  } catch {
    return false;
  }

  if (payload.c !== contaIdEsperada) return false;
  if (typeof payload.v !== "number" || Date.now() - payload.v > JANELA_DE_CONTA_ATIVA_MS) return false;
  return true;
}
