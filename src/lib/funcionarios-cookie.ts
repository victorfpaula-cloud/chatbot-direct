// Só a constante do nome do cookie, separada de src/lib/funcionarios.ts de propósito: o
// middleware (que roda em Edge Runtime, sem `node:crypto`) importa só isso daqui, nunca o
// hash/verificação de senha — que fica em funcionarios.ts e só roda em rota normal (Node.js).
export const NOME_DO_COOKIE_DE_SESSAO = "chatbot_funcionario_sessao";
