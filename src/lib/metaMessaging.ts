import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

const GRAPH_API_VERSION = "v21.0";

export type MensagemDaPonte =
  | { tipo: "texto"; texto: string }
  | { tipo: "botoes"; texto: string; botoes: { titulo: string; payload: string }[] };

/**
 * Ponte temporária com o SendPulse (ver src/app/api/bridge/sendpulse/route.ts): enquanto a Meta
 * não aprova o App do chatbot-direct pra conversar com clientes de verdade (Standard Access só
 * deixa mandar mensagem pra admin/testador do App), o SendPulse continua sendo quem manda a
 * mensagem de verdade pro Direct — o chatbot-direct só decide o QUE responder.
 *
 * Em vez de reescrever `processarMensagemDeReserva` (fluxo de estado com dezenas de chamadas de
 * envio espalhadas) pra devolver texto em vez de mandar direto, essas duas funções de envio
 * conferem se estão rodando dentro de `executarComPonteSendPulse` e, se estiverem, só empilham a
 * mensagem no coletor em vez de chamar a Graph API — o resto do fluxo de reserva não muda uma
 * linha. Fora da ponte (webhook direto da Meta), o comportamento é exatamente o de sempre.
 *
 * O mesmo contexto também carrega o `perfilConhecido` (nome/@usuário que o SendPulse já manda
 * junto da mensagem) — usado por `buscarPerfilDoCliente` abaixo, porque o `instagram_scoped_id`
 * das conversas da ponte é sintético (`sendpulse:...`), não um IGSID de verdade, então a busca na
 * Graph API sempre falharia e cairia no nome genérico "Cliente" (foi exatamente isso que
 * aconteceu na reserva de teste — o nome salvo veio como "Cliente" em vez do nome real).
 */
type ContextoDaPonte = {
  mensagens: MensagemDaPonte[];
  perfilConhecido?: { nome: string; username: string | null };
};

const armazenamentoDaPonte = new AsyncLocalStorage<ContextoDaPonte>();

export async function executarComPonteSendPulse<T>(
  perfilConhecido: { nome: string; username: string | null } | undefined,
  funcao: () => Promise<T>
): Promise<{ resultado: T; mensagens: MensagemDaPonte[] }> {
  const contexto: ContextoDaPonte = { mensagens: [], perfilConhecido };
  const resultado = await armazenamentoDaPonte.run(contexto, funcao);
  return { resultado, mensagens: contexto.mensagens };
}

/**
 * Confere a assinatura X-Hub-Signature-256 que a Meta manda em todo webhook, calculada em cima
 * do corpo BRUTO (raw) da requisição usando o App Secret como chave HMAC-SHA256. Isso garante
 * que a chamada realmente veio da Meta, e não de qualquer um que descubra a URL do webhook.
 * Comparação em tempo constante (timingSafeEqual) pra não vazar informação por tempo de resposta.
 */
export function assinaturaValida(corpoBruto: string, assinaturaRecebida: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret || !assinaturaRecebida) return false;

  const esperada =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(corpoBruto, "utf8").digest("hex");

  const bufferEsperado = Buffer.from(esperada, "utf8");
  const bufferRecebido = Buffer.from(assinaturaRecebida, "utf8");

  return (
    bufferEsperado.length === bufferRecebido.length &&
    crypto.timingSafeEqual(bufferEsperado, bufferRecebido)
  );
}

/**
 * Envia uma mensagem de texto pro Direct de um cliente, usando o token de acesso da Página
 * conectada (mesmo padrão de conexão via Facebook Login que o agendador já usa). O endpoint
 * oficial é `/me/messages` (a Meta resolve pra Página certa a partir do próprio token) — não
 * `/{page-id}/messages`, confirmado na documentação da Instagram Messaging API.
 */
export async function enviarMensagemDirect(
  tokenDaConta: string,
  igsidDoCliente: string,
  texto: string
): Promise<void> {
  const contextoDaPonte = armazenamentoDaPonte.getStore();
  if (contextoDaPonte) {
    contextoDaPonte.mensagens.push({ tipo: "texto", texto });
    return;
  }

  const resposta = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(
      tokenDaConta
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: igsidDoCliente },
        message: { text: texto },
      }),
      cache: "no-store",
    }
  );

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    throw new Error(
      `Falha ao enviar mensagem pro Direct (status ${resposta.status}): ${corpoErro}`
    );
  }
}

/**
 * Envia uma mensagem com botões de verdade (Button Template) — usado no fluxo de reserva
 * (Etapa 6) pra oferecer opções tocáveis (Hoje/Amanhã/Outro dia, Almoço/Jantar, Sim/Não). Esse é
 * o mesmo tipo de botão que aparece na captura de tela que o Victor mandou (o bot antigo do
 * SendPulse usava isso): o botão fica DENTRO da mensagem, junto com o texto, e continua visível
 * no histórico depois de tocado — diferente do formato anterior (quick replies), que aparecia só
 * como uma barrinha temporária em cima do teclado e sumia depois de usada.
 *
 * Limites da Meta pra esse formato: até 3 botões por mensagem, título de cada botão com até 20
 * caracteres, texto da mensagem com até ~640 caracteres — por isso o texto que chega aqui deve
 * ser sempre curto (a regra é: textos longos, tipo as Regras cadastradas, vão em mensagens de
 * texto simples separadas, nunca dentro de uma mensagem com botão).
 */
export async function enviarMensagemComBotoes(
  tokenDaConta: string,
  igsidDoCliente: string,
  texto: string,
  botoes: { titulo: string; payload: string }[]
): Promise<void> {
  const contextoDaPonte = armazenamentoDaPonte.getStore();
  if (contextoDaPonte) {
    contextoDaPonte.mensagens.push({ tipo: "botoes", texto, botoes });
    return;
  }

  const resposta = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(
      tokenDaConta
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: igsidDoCliente },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: texto,
              buttons: botoes.map((botao) => ({
                type: "postback",
                title: botao.titulo,
                payload: botao.payload,
              })),
            },
          },
        },
      }),
      cache: "no-store",
    }
  );

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    throw new Error(
      `Falha ao enviar mensagem com botões pro Direct (status ${resposta.status}): ${corpoErro}`
    );
  }
}

/**
 * Junta o que foi coletado por `executarComPonteSendPulse` num único texto pro SendPulse mandar.
 * O construtor de fluxo visual do SendPulse só tem um campo de texto simples pra resposta da
 * ponte (não dá pra montar botão tocável dinâmico a partir de uma resposta de API) — então um
 * passo com botões vira a pergunta seguida da lista das opções em texto puro. Isso funciona sem
 * nenhuma mudança no fluxo de reserva porque `interpretarData`/`interpretarPeriodo`/
 * `interpretarSimNao` (em reservas.ts) já aceitam essas mesmas palavras digitadas livremente, não
 * só o payload do clique — mesma dualidade "digita ou toca" que o fluxo direto pela Meta usa.
 * Se nada foi coletado (bot ficou em silêncio de propósito), devolve null.
 */
export function formatarMensagensDaPonte(mensagens: MensagemDaPonte[]): string | null {
  if (mensagens.length === 0) return null;

  return mensagens
    .map((mensagem) =>
      mensagem.tipo === "texto"
        ? mensagem.texto
        : `${mensagem.texto}\n\n${mensagem.botoes.map((botao) => `• ${botao.titulo}`).join("\n")}`
    )
    .join("\n\n");
}

/**
 * Busca nome e @usuário do Instagram de quem mandou a mensagem — usado no fluxo de reserva pra
 * não precisar perguntar o nome (Etapa 6). Se a chamada falhar por qualquer motivo, devolve um
 * nome genérico em vez de derrubar o fluxo inteiro por causa disso.
 */
export async function buscarPerfilDoCliente(
  tokenDaConta: string,
  instagramScopedId: string
): Promise<{ nome: string; username: string | null }> {
  const contextoDaPonte = armazenamentoDaPonte.getStore();
  if (contextoDaPonte?.perfilConhecido) {
    return contextoDaPonte.perfilConhecido;
  }

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramScopedId}?fields=name,username&access_token=${encodeURIComponent(
        tokenDaConta
      )}`,
      { cache: "no-store" }
    );

    if (!resposta.ok) return { nome: "Cliente", username: null };

    const dados = await resposta.json();
    return {
      nome: typeof dados?.name === "string" && dados.name ? dados.name : "Cliente",
      username: typeof dados?.username === "string" ? dados.username : null,
    };
  } catch (erro) {
    console.error("Falha ao buscar perfil do cliente no Instagram:", erro);
    return { nome: "Cliente", username: null };
  }
}

/**
 * Busca a URL da foto de perfil da PRÓPRIA conta do Instagram conectada (não de um cliente) —
 * usada pra mostrar a foto de verdade na bolinha do avatar da tela de contas, em vez de só uma
 * letra. De propósito NUNCA é guardada no banco: esse link que a Meta devolve é temporário e
 * expira depois de um tempo, então se guardássemos ele, a foto ia quebrar sozinha mais tarde sem
 * nenhum aviso. Por isso é buscada de novo a cada vez que a tela de contas é aberta (mesma lógica
 * do "status do dia" — a tela já busca tudo de novo a cada abertura). Se falhar por qualquer
 * motivo, devolve null (a tela usa a bolinha colorida com a letra como reserva).
 */
export async function buscarFotoDePerfilDaConta(
  tokenDaConta: string,
  instagramUserId: string
): Promise<string | null> {
  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramUserId}?fields=profile_picture_url&access_token=${encodeURIComponent(
        tokenDaConta
      )}`,
      { cache: "no-store" }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    return typeof dados?.profile_picture_url === "string" ? dados.profile_picture_url : null;
  } catch (erro) {
    console.error("Falha ao buscar foto de perfil da conta:", erro);
    return null;
  }
}

/**
 * Busca a foto de perfil de um CLIENTE (mesmo endpoint/campo de `buscarFotoDePerfilDaConta`, só
 * que pelo `instagram_scoped_id` da conversa em vez do ID da própria conta) — usada só na tela
 * "Reservas de hoje" pra mostrar a foto de verdade em vez da bolinha genérica, já que ali é sempre
 * um número pequeno de reservas por dia. De propósito NUNCA é guardada no banco: é buscada de novo
 * a cada abertura da tela, igual `buscarFotoDePerfilDaConta`. IDs sintéticos (reservas antigas
 * migradas manualmente, sem IGSID de verdade) simplesmente falham na chamada e caem no null.
 */
export async function buscarFotoDePerfilDoCliente(
  tokenDaConta: string,
  instagramScopedId: string
): Promise<string | null> {
  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramScopedId}?fields=profile_picture_url&access_token=${encodeURIComponent(
        tokenDaConta
      )}`,
      { cache: "no-store" }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    return typeof dados?.profile_picture_url === "string" ? dados.profile_picture_url : null;
  } catch (erro) {
    console.error("Falha ao buscar foto de perfil do cliente:", erro);
    return null;
  }
}
