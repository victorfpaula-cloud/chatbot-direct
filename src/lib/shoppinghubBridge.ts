// Ponte com o ShoppingHub — pras contas marcadas com `shoppinghub = true` em chatbot_accounts (ver
// api/webhook/instagram/route.ts). Substitui a ponte que o ShoppingHub tinha com a SendPulse
// (desativada em 07/11/2026): como esse App já tem Acesso Avançado aprovado pela Meta pra
// mensageria, ele mesmo recebe o Direct de verdade — só repassa pro ShoppingHub decidir o quê
// fazer (responder uma mensagem normal, ou processar uma menção de Story), e cuida de mandar a
// resposta de volta pro cliente com o PRÓPRIO token (o ShoppingHub nunca fala com a Meta nesse
// fluxo de chat; já fala direto na publicação de Stories, que é outra permissão/token, sem mudança
// nenhuma aqui).

const BASE_URL = process.env.SHOPPINGHUB_BASE_URL ?? "https://shoppinghub-hazel.vercel.app";

function segredoCompartilhado(): string {
  const valor = process.env.SHOPPINGHUB_BRIDGE_SECRET;
  if (!valor) {
    throw new Error("Faltou configurar a variável de ambiente SHOPPINGHUB_BRIDGE_SECRET.");
  }
  return valor;
}

export async function encaminharMencaoPraShoppingHub(opts: {
  instagramUserId: string;
  instagramScopedId: string;
  username: string;
  url: string;
  mid?: string;
}): Promise<void> {
  const resposta = await fetch(`${BASE_URL}/api/bridge/chatbot-direct/mencao`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bridge-secret": segredoCompartilhado() },
    body: JSON.stringify({
      instagram_user_id: opts.instagramUserId,
      instagram_scoped_id: opts.instagramScopedId,
      username: opts.username,
      url: opts.url,
      mid: opts.mid,
    }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpoBruto = await resposta.text().catch(() => "");
    throw new Error(`ShoppingHub recusou a menção (status ${resposta.status}): ${corpoBruto}`);
  }
}

const RESPOSTA_DE_FALLBACK =
  "Recebemos sua mensagem, mas tivemos um problema técnico pra responder agora. Vamos te retornar em breve.";

export async function encaminharMensagemPraShoppingHub(opts: {
  instagramUserId: string;
  contatoId: string;
  texto: string;
  username: string | null;
  nome: string | null;
}): Promise<string> {
  const resposta = await fetch(`${BASE_URL}/api/bridge/chatbot-direct/mensagem`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bridge-secret": segredoCompartilhado() },
    body: JSON.stringify({
      instagram_user_id: opts.instagramUserId,
      contato_id: opts.contatoId,
      texto: opts.texto,
      username: opts.username,
      nome: opts.nome,
    }),
    cache: "no-store",
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    console.error(`Falha ao encaminhar mensagem pro ShoppingHub (status ${resposta.status}):`, dados);
    return RESPOSTA_DE_FALLBACK;
  }

  return dados?.resposta ?? RESPOSTA_DE_FALLBACK;
}
