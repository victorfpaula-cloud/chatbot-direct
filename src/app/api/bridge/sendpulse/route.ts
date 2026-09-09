import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { executarComPonteSendPulse, formatarMensagensDaPonte, type MensagemDaPonte } from "@/lib/metaMessaging";
import { decidirEResponder } from "@/lib/respostaAutomatica";
import { registrarAtendimento } from "@/lib/atendimentos";
import { enviarBotoesPelaApiDaSendPulse, enviarTextoPelaApiDaSendPulse } from "@/lib/sendpulseApi";

// Ponte temporária: enquanto o App Review do chatbot-direct não sai (Standard Access só deixa a
// Meta mandar mensagem pra admin/testador do App, nunca pra cliente de verdade), o SendPulse —
// que já tem acesso aprovado — continua recebendo/enviando as mensagens reais do Direct pras
// contas ainda não migradas (ver README, "Migração das contas do SendPulse, uma de cada vez").
// Esse endpoint só decide o QUE responder; quem manda pro cliente de verdade é sempre o SendPulse.
// Mesmo padrão já usado no ShoppingHub (ver src/app/api/bridge/sendpulse/route.ts de lá).
//
// Autenticado por um segredo compartilhado (não dá pra usar a assinatura da Meta aqui, já que
// quem está chamando é o SendPulse, não a Meta).
//
// O botão "Pedido de teste" do construtor de fluxo da SendPulse chama esse endpoint direto do
// navegador (não do servidor deles) — o navegador manda um preflight OPTIONS antes do POST de
// verdade, e sem responder esse preflight com os cabeçalhos de CORS certos, ele falha com 405
// antes mesmo do POST ser tentado. Por isso o OPTIONS abaixo e os cabeçalhos em toda resposta.
const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-bridge-secret",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CABECALHOS_CORS });
}

export async function POST(request: NextRequest) {
  const segredoRecebido = request.headers.get("x-bridge-secret");
  const segredoEsperado = process.env.SENDPULSE_BRIDGE_SECRET;

  if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401, headers: CABECALHOS_CORS });
  }

  const corpo = await request.json().catch(() => null);
  if (!corpo) {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400, headers: CABECALHOS_CORS });
  }

  const contaUsername: string | undefined = corpo.conta_username
    ?.toString()
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const textoDaMensagem: string | undefined = corpo.texto?.toString().trim();
  const contatoId: string | undefined = corpo.contato_id?.toString();
  const username: string | null = corpo.username
    ? corpo.username.toString().replace(/^@/, "").toLowerCase()
    : null;
  const nomeDoCliente: string = corpo.nome ? corpo.nome.toString() : "Cliente";

  if (!contaUsername || !textoDaMensagem || !contatoId) {
    return NextResponse.json(
      { erro: "Faltou conta_username, texto ou contato_id no corpo da requisição." },
      { status: 400, headers: CABECALHOS_CORS }
    );
  }

  const admin = criarClienteAdmin();

  const { data: conta } = await admin
    .from("chatbot_accounts")
    .select("id, access_token")
    .ilike("instagram_username", contaUsername)
    .eq("active", true)
    .maybeSingle();

  if (!conta) {
    return NextResponse.json(
      { erro: `Conta "@${contaUsername}" não encontrada/ativa.` },
      { status: 404, headers: CABECALHOS_CORS }
    );
  }

  // Mesmo prefixo em toda mensagem vinda dessa ponte — evita colidir com o instagram_scoped_id
  // (IGSID) de verdade usado no fluxo direto via Meta, mas mantém tudo na MESMA tabela de
  // conversas/atendimentos, então o painel mostra os dois fluxos juntos sem distinção.
  const idDoCliente = `sendpulse:${contatoId}`;

  const { resultado, mensagens } = await executarComPonteSendPulse(() =>
    decidirEResponder(admin, conta, idDoCliente, { text: textoDaMensagem })
  );

  // Manda TODAS as mensagens (texto e botão) direto pela API da SendPulse, na mesma ordem em que
  // foram decididas (ver src/lib/sendpulseApi.ts) — antes, só a mensagem com botão saía por esse
  // caminho direto/imediato e o texto simples saía pela resposta HTTP (que só é entregue depois
  // que o fluxo da SendPulse processa), fazendo o texto chegar DEPOIS do botão no chat do
  // cliente mesmo tendo sido decidido antes. Se a chamada falhar por qualquer motivo (credenciais
  // não configuradas, rede, to_chain_id errado, etc.), cai de volta pra devolver aquele trecho
  // como texto na resposta HTTP — nunca deixa um passo sem resposta nenhuma por causa disso.
  const mensagensRestantes: MensagemDaPonte[] = [];
  let erroAoEnviarMensagem: unknown = null;
  for (const mensagem of mensagens) {
    try {
      if (mensagem.tipo === "botoes") {
        await enviarBotoesPelaApiDaSendPulse(contatoId, mensagem.texto, mensagem.botoes);
      } else {
        await enviarTextoPelaApiDaSendPulse(contatoId, mensagem.texto);
      }
    } catch (erro) {
      console.error("[ponte SendPulse] falha ao enviar mensagem via API, caindo no texto da resposta HTTP:", erro);
      erroAoEnviarMensagem = erro;
      mensagensRestantes.push(mensagem);
    }
  }

  const respostaFinal = formatarMensagensDaPonte(mensagensRestantes);

  await registrarAtendimento(admin, {
    contaId: conta.id,
    tokenDaConta: conta.access_token,
    idDoCliente,
    mensagemRecebida: textoDaMensagem,
    tipoResposta: resultado.tipoResposta,
    respostaEnviada: respostaFinal,
    status: resultado.erroOcorrido
      ? "erro"
      : resultado.tipoResposta === "sem_resposta"
        ? "sem_resposta"
        : "respondido",
    // Diagnóstico temporário: se a decisão em si não deu erro mas o envio direto via API da
    // SendPulse falhou (caiu no texto de backup da resposta HTTP), guarda o motivo aqui mesmo
    // assim — só assim dá pra enxergar essa falha sem acesso aos logs do Vercel.
    erroDetalhe: resultado.erroOcorrido
      ? String((resultado.erroOcorrido as any)?.message ?? resultado.erroOcorrido)
      : erroAoEnviarMensagem
        ? `[falha ao enviar via API, caiu no texto da resposta HTTP] ${String((erroAoEnviarMensagem as any)?.message ?? erroAoEnviarMensagem)}`
        : null,
    perfilConhecido: { nome: nomeDoCliente, username },
  });

  if (resultado.erroOcorrido) {
    console.error("[ponte SendPulse] erro processando mensagem:", resultado.erroOcorrido);
  }

  // `resposta: null` quando o bot ficou em silêncio de propósito (nenhuma palavra-chave bateu e a
  // conta não tem Gemini configurado) — o fluxo da SendPulse precisa checar isso antes de mandar
  // (ver aviso no chat).
  return NextResponse.json({ resposta: respostaFinal }, { headers: CABECALHOS_CORS });
}
