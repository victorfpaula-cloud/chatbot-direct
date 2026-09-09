import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { assinaturaValida, buscarPerfilDoCliente } from "@/lib/metaMessaging";
import { decidirEResponder } from "@/lib/respostaAutomatica";
import { registrarAtendimento } from "@/lib/atendimentos";
import { contaTemIgnorados, usernameEstaIgnorado } from "@/lib/ignorados";

export async function GET(request: NextRequest) {
  const modo = request.nextUrl.searchParams.get("hub.mode");
  const tokenRecebido = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const tokenEsperado = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (modo === "subscribe" && tokenEsperado && tokenRecebido === tokenEsperado && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verificação falhou.", { status: 403 });
}

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();
  const assinatura = request.headers.get("x-hub-signature-256");

  if (!assinaturaValida(corpoBruto, assinatura)) {
    return new NextResponse("Assinatura inválida.", { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const admin = criarClienteAdmin();

  const entradas: any[] = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entrada of entradas) {
    const eventosDeMensagem: any[] = Array.isArray(entrada?.messaging) ? entrada.messaging : [];

    for (const evento of eventosDeMensagem) {
      try {
        await processarEventoDeMensagem(admin, evento);
      } catch (erro) {
        console.error("Erro processando evento de mensagem do Direct:", erro);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function processarEventoDeMensagem(admin: ReturnType<typeof criarClienteAdmin>, evento: any) {
  const mensagemOriginal = evento?.message;
  const postback = evento?.postback;

  if (mensagemOriginal?.is_echo) {
    return;
  }

  if (!mensagemOriginal && !postback) {
    return;
  }

  // Toque num botão do novo formato (Button Template, usado no fluxo de reserva) chega como um
  // evento "postback", NÃO como "message" — é um formato totalmente diferente da Meta. Normaliza
  // aqui pro mesmo formato que o resto do código já entende (`quick_reply.payload`), então nada
  // mais precisa saber se foi um toque de botão ou uma resposta digitada.
  const mensagem: { text?: string; quick_reply?: { payload: string } } = postback
    ? { quick_reply: { payload: postback.payload } }
    : mensagemOriginal;

  const idDaMensagem: string | undefined = postback
    ? postback.mid ?? `postback_${evento?.sender?.id}_${evento?.timestamp}_${postback.payload}`
    : mensagemOriginal?.mid;
  const idDoCliente: string | undefined = evento?.sender?.id;
  const idDaContaRecebendo: string | undefined = evento?.recipient?.id;
  const textoDaMensagem: string | undefined = mensagem.text;

  if (!idDaMensagem || !idDoCliente || !idDaContaRecebendo) {
    return;
  }

  const { error: erroAoRegistrar } = await admin
    .from("chatbot_processed_messages")
    .insert({ message_id: idDaMensagem });

  if (erroAoRegistrar) {
    if ((erroAoRegistrar as any).code === "23505") return;
    throw erroAoRegistrar;
  }

  const { data: conta, error: erroAoBuscarConta } = await admin
    .from("chatbot_accounts")
    .select("id, access_token")
    .eq("instagram_user_id", idDaContaRecebendo)
    .eq("active", true)
    .maybeSingle();

  if (erroAoBuscarConta) throw erroAoBuscarConta;

  if (!conta) {
    console.warn(
      `Mensagem recebida pra uma conta ainda não conectada no sistema (instagram_user_id=${idDaContaRecebendo}).`
    );
    return;
  }

  // @usuário na lista de ignorados dessa conta (ex.: o próprio dono) — ignora completamente, sem
  // responder e sem registrar em chatbot_atendimentos (ver src/app/contas/[id]/ignorados). Só
  // busca o perfil na Graph API (custa uma chamada extra) se a conta tiver algum @usuário
  // cadastrado pra ignorar — a maioria não tem, então a maioria das mensagens não paga esse custo.
  if (await contaTemIgnorados(admin, conta.id)) {
    const perfil = await buscarPerfilDoCliente(conta.access_token, idDoCliente);
    if (await usernameEstaIgnorado(admin, conta.id, perfil.username)) {
      return;
    }
  }

  // Descrição amigável do que o cliente mandou, pra aparecer no histórico de atendimentos — toque
  // num botão (postback) não tem texto de verdade, então usa o título do botão nesse caso.
  const descricaoDaMensagemRecebida = postback
    ? `[botão] ${postback.title ?? postback.payload}`
    : textoDaMensagem ?? "[mensagem sem texto — áudio, imagem, story etc.]";

  // Etapa 6 — fluxo de reserva: checado ANTES de palavra-chave/Gemini dentro de decidirEResponder,
  // porque enquanto alguém está no meio de uma reserva (respondendo data/período/pessoas/
  // WhatsApp/confirmação), toda mensagem nova dessa pessoa precisa ser tratada como resposta da
  // pergunta atual — nunca cair no atendimento normal por engano.
  const { tipoResposta, respostaResumo, erroOcorrido } = await decidirEResponder(
    admin,
    conta,
    idDoCliente,
    mensagem
  );

  // Registro no histórico de atendimentos (melhor esforço — nunca atrasa nem derruba o
  // processamento da mensagem de verdade, mesmo se der algum problema aqui).
  await registrarAtendimento(admin, {
    contaId: conta.id,
    tokenDaConta: conta.access_token,
    idDoCliente,
    mensagemRecebida: descricaoDaMensagemRecebida,
    tipoResposta,
    respostaEnviada: respostaResumo,
    status: erroOcorrido ? "erro" : tipoResposta === "sem_resposta" ? "sem_resposta" : "respondido",
    erroDetalhe: erroOcorrido ? String((erroOcorrido as any)?.message ?? erroOcorrido) : null,
  });

  if (erroOcorrido) {
    console.error("Erro processando evento de mensagem do Direct:", erroOcorrido);
  }
}
