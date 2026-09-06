import crypto from "node:crypto";

export { NOME_DO_COOKIE_DE_SESSAO } from "./funcionarios-cookie";

// Login próprio (separado do Supabase Auth que o Victor usa) pros funcionários do restaurante —
// só dá acesso à tela de reservas do dia (/reservas), nada mais do painel. Mesmo estilo de
// crypto "na mão" já usado no resto do projeto (ver assinaturaValida em metaMessaging.ts e o JWT
// manual em googleSheets.ts), sem precisar de mais uma dependência externa (tipo bcrypt) só pra
// isso.

const TAMANHO_DO_HASH = 64;
const DURACAO_DA_SESSAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Gera "salt:hash" a partir de uma senha em texto puro — isso é o que vai pra `senha_hash`. */
export function gerarHashDeSenha(senha: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(senha, salt, TAMANHO_DO_HASH).toString("hex");
  return `${salt}:${hash}`;
}

/** Confere se `senha` bate com o `salt:hash` guardado em `senha_hash`, em tempo constante. */
export function senhaConfere(senha: string, hashArmazenado: string): boolean {
  const [salt, hashOriginal] = hashArmazenado.split(":");
  if (!salt || !hashOriginal) return false;

  const hashTentativa = crypto.scryptSync(senha, salt, TAMANHO_DO_HASH).toString("hex");

  const bufferOriginal = Buffer.from(hashOriginal, "hex");
  const bufferTentativa = Buffer.from(hashTentativa, "hex");

  return (
    bufferOriginal.length === bufferTentativa.length &&
    crypto.timingSafeEqual(bufferOriginal, bufferTentativa)
  );
}

/** Token opaco da sessão — vai puro (sem hash) no cookie e na tabela, mesmo padrão já usado em
 * chatbot_oauth_states/chatbot_pending_connections (protegido por só rota server-side com
 * service role acessar essa tabela). */
export function gerarTokenDeSessao(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function calcularExpiracaoDaSessao(): string {
  return new Date(Date.now() + DURACAO_DA_SESSAO_MS).toISOString();
}
