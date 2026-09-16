import crypto from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

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

async function tentarBuscarPerfilDoCliente(
  tokenDaConta: string,
  instagramScopedId: string
): Promise<{ nome: string; username: string | null } | null> {
  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramScopedId}?fields=name,username&access_token=${encodeURIComponent(
        tokenDaConta
      )}`,
      { cache: "no-store" }
    );

    if (!resposta.ok) {
      // Antes caía em silêncio total no nome genérico — sem status nem corpo da resposta, não dava
      // pra saber se foi token expirado, rate limit, permissão faltando ou o quê (foi exatamente
      // essa falta de log que impediu de diagnosticar a reserva que salvou "Cliente" em produção).
      const corpoDoErro = await resposta.text().catch(() => "");
      console.error(
        `Falha ao buscar perfil do cliente no Instagram (status ${resposta.status}) para IGSID ${instagramScopedId}:`,
        corpoDoErro
      );
      return null;
    }

    const dados = await resposta.json();
    const username = typeof dados?.username === "string" ? dados.username : null;
    // Nem todo mundo tem um nome de exibição preenchido no Instagram (só @usuário) — a Graph API
    // devolve `name` vazio nesse caso, sem erro nenhum pra pegar (foi exatamente isso que aconteceu
    // na reserva da Ana Jux — ver conversa de 15/09). "@usuário" identifica muito melhor a pessoa
    // do que o genérico "Cliente" quando isso acontecer de novo.
    const nome =
      typeof dados?.name === "string" && dados.name ? dados.name : username ? `@${username}` : "Cliente";
    return { nome, username };
  } catch (erro) {
    console.error(`Falha ao buscar perfil do cliente no Instagram para IGSID ${instagramScopedId}:`, erro);
    return null;
  }
}

/**
 * Busca nome e @usuário do Instagram de quem mandou a mensagem — usado no fluxo de reserva pra
 * não precisar perguntar o nome (Etapa 6). Tenta uma segunda vez antes de desistir (uma reserva
 * salva com o nome genérico "Cliente" não tem como ser corrigida sozinha depois, então vale a pena
 * uma segunda tentativa pra cobrir uma falha passageira de rede/rate-limit) — só cai no nome
 * genérico se as duas tentativas falharem.
 */
export async function buscarPerfilDoCliente(
  tokenDaConta: string,
  instagramScopedId: string
): Promise<{ nome: string; username: string | null }> {
  const primeiraTentativa = await tentarBuscarPerfilDoCliente(tokenDaConta, instagramScopedId);
  if (primeiraTentativa) return primeiraTentativa;

  await new Promise((resolve) => setTimeout(resolve, 400));
  const segundaTentativa = await tentarBuscarPerfilDoCliente(tokenDaConta, instagramScopedId);
  return segundaTentativa ?? { nome: "Cliente", username: null };
}

/**
 * Busca a foto de perfil de um cliente pelo @usuário (em vez do ID), usando a "Business Discovery"
 * da própria Graph API — só precisa do token/ID da NOSSA conta, nunca depende da SendPulse. Serve
 * de fallback pra reserva antiga feita pela ponte (já removida) cujo `sendpulse:<contato_id>`
 * morreu (ex.: contato apagado no painel da SendPulse) mas o @usuário do cliente já estava salvo
 * na reserva.
 * Limitação real da Meta: só funciona se a conta do CLIENTE também for Business/Criador de
 * conteúdo — pra conta pessoal comum, a Meta não expõe esse campo e a chamada falha normalmente
 * (cai no null, mesmo comportamento de qualquer outra falha de busca de foto).
 */
export async function buscarFotoDePerfilPorUsername(
  tokenDaConta: string,
  instagramUserId: string,
  username: string
): Promise<string | null> {
  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramUserId}?fields=business_discovery.username(${encodeURIComponent(
        username
      )}){profile_picture_url}&access_token=${encodeURIComponent(tokenDaConta)}`,
      { cache: "no-store" }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    const foto = dados?.business_discovery?.profile_picture_url;
    return typeof foto === "string" ? foto : null;
  } catch (erro) {
    console.error("Falha ao buscar foto de perfil por @usuário (business discovery):", erro);
    return null;
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

    if (!resposta.ok) {
      // Sem log nenhum antes — não dava pra saber se a Meta tá recusando por permissão/token, ou
      // se é só o campo vindo vazio (perfil privado, ver comentário da função acima). São causas
      // bem diferentes: uma dá pra corrigir do nosso lado, a outra é limitação de privacidade da
      // própria Meta que nenhum código nosso contorna.
      const corpoDoErro = await resposta.text().catch(() => "");
      console.error(
        `Falha ao buscar foto de perfil do cliente (status ${resposta.status}) para IGSID ${instagramScopedId}:`,
        corpoDoErro
      );
      return null;
    }

    const dados = await resposta.json();
    return typeof dados?.profile_picture_url === "string" ? dados.profile_picture_url : null;
  } catch (erro) {
    console.error(`Falha ao buscar foto de perfil do cliente para IGSID ${instagramScopedId}:`, erro);
    return null;
  }
}
