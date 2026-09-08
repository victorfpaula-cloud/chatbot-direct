import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { executarComPonteSendPulse, formatarMensagensDaPonte } from "@/lib/metaMessaging";
import { decidirEResponder } from "@/lib/respostaAutomatica";
import { registrarAtendimento } from "@/lib/atendimentos";

// Ponte temporária: enquanto o App Review do chatbot-direct não sai (Standard Access só deixa a
// Meta mandar mensagem pra admin/testador do App, nunca pra cliente de verdade), o SendPulse —
// que já tem acesso aprovado — continua recebendo/enviando as mensagens reais do Direct pras
// contas ainda não migradas (ver README, "Migração das contas do SendPulse, uma de cada vez").
// Esse endpoint só decide o QUE responder; quem manda pro cliente de verdade é sempre o SendPulse.
// Mesmo padrão já usado no ShoppingHub (ver src/app/api/bridge/sendpulse/route.ts de lá).
//
// Autenticado por um segredo compartilhado (não dá pra usar a assinatura da Meta aqui, já que
// quem está chamando é o SendPulse, não a Meta).
export async function POST(request: NextRequest) {
  const segredoRecebido = request.headers.get("x-bridge-secret");
  const segredoEsperado = process.env.SENDPULSE_BRIDGE_SECRET;

  if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  if (!corpo) {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
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
      { status: 400 }
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
    return NextResponse.json({ erro: `Conta "@${contaUsername}" não encontrada/ativa.` }, { status: 404 });
  }

  // Mesmo prefixo em toda mensagem vinda dessa ponte — evita colidir com o instagram_scoped_id
  // (IGSID) de verdade usado no fluxo direto via Meta, mas mantém tudo na MESMA tabela de
  // conversas/atendimentos, então o painel mostra os dois fluxos juntos sem distinção.
  const idDoCliente = `sendpulse:${contatoId}`;

  const { resultado, mensagens } = await executarComPonteSendPulse(() =>
    decidirEResponder(admin, conta, idDoCliente, { text: textoDaMensagem })
  );

  const respostaFinal = formatarMensagensDaPonte(mensagens);

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
    erroDetalhe: resultado.erroOcorrido
      ? String((resultado.erroOcorrido as any)?.message ?? resultado.erroOcorrido)
      : null,
    perfilConhecido: { nome: nomeDoCliente, username },
  });

  if (resultado.erroOcorrido) {
    console.error("[ponte SendPulse] erro processando mensagem:", resultado.erroOcorrido);
  }

  // `resposta: null` quando o bot ficou em silêncio de propósito (nenhuma palavra-chave bateu e a
  // conta não tem Gemini configurado) — o fluxo da SendPulse precisa checar isso antes de mandar
  // (ver aviso no chat).
  return NextResponse.json({ resposta: respostaFinal });
}
