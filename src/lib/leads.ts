import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarMensagemDirect, enviarMensagemComBotoes, buscarPerfilDoCliente } from "@/lib/metaMessaging";
import { notificarNovoLead } from "@/lib/notificacoesAdmin";

// Fase 2 do vertical Imobiliário (19/11/2026) — qualificação de lead por etapas, mesmo espírito do
// fluxo de Reserva (src/lib/reservas.ts): conversa com estado guardada em chatbot_conversations,
// uma pergunta de cada vez, nunca cai em palavra-chave/Gemini até terminar ou desistir. De
// propósito SEM NENHUMA dependência de reservas.ts (duplica os pedacinhos pequenos que precisa —
// normalizar, ehPedidoDeCancelamento, atualizarEtapa, encerrarConversa — em vez de importar) pra
// garantir que mexer aqui NUNCA tem como quebrar o fluxo de Reserva dos restaurantes, e vice-versa.
//
// Só roda de verdade quando `leads_habilitado` está true — nasce false pra toda conta (ver
// migration), então nenhuma conta existente aciona esse código até alguém ativar isso na aba Leads.

type Admin = ReturnType<typeof criarClienteAdmin>;
type Conta = { id: string; access_token: string; page_name: string | null };

const LEAD_INTERESSE_COMPRAR = "LEAD_INTERESSE_COMPRAR";
const LEAD_INTERESSE_ALUGAR = "LEAD_INTERESSE_ALUGAR";
const LEAD_INTERESSE_VENDER = "LEAD_INTERESSE_VENDER";

// Mesmo prazo de "conversa abandonada" que a Reserva usa — se a pessoa sumir no meio das
// perguntas, depois dessa janela a próxima mensagem dela (sobre qualquer assunto) não fica mais
// presa tentando responder uma pergunta de qualificação que não faz mais sentido.
const TIMEOUT_CONVERSA_ABANDONADA_MS = 60 * 60 * 1000;

const SUGESTAO_DE_CANCELAR = ' Se preferir, digite "cancelar" pra encerrar por aqui.';

type IdDePergunta = "interesse" | "tipo" | "regiao" | "preco" | "quartos";

const DEFINICAO_DAS_PERGUNTAS: Record<IdDePergunta, { pergunta: string }> = {
  interesse: { pergunta: "Você quer comprar, alugar ou vender um imóvel?" },
  tipo: { pergunta: "Que tipo de imóvel você procura? (casa, apartamento, terreno, comercial...)" },
  regiao: { pergunta: "Em qual bairro ou região você tem interesse?" },
  preco: { pergunta: "Até quanto você pretende investir (ou pagar por mês, se for aluguel)?" },
  quartos: { pergunta: "Quantos quartos você precisa?" },
};

const ORDEM_PADRAO: IdDePergunta[] = ["interesse", "tipo", "regiao", "preco", "quartos"];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function ehPedidoDeCancelamento(texto: string | undefined): boolean {
  const t = texto ? normalizar(texto.trim()) : "";
  if (!t) return false;
  return /^(cancelar|cancela|desistir|desisto|parar|encerrar|sair)\b/.test(t);
}

async function atualizarEtapa(admin: Admin, conversaId: string, etapa: string, dados: any) {
  await admin
    .from("chatbot_conversations")
    .update({ etapa_atual: etapa, dados_coletados: dados, atualizado_em: new Date().toISOString() })
    .eq("id", conversaId);
}

async function encerrarConversa(admin: Admin, conversaId: string) {
  await admin.from("chatbot_conversations").delete().eq("id", conversaId);
}

function interpretarInteresse(payload: string | undefined, texto: string | undefined): string | null {
  if (payload === LEAD_INTERESSE_COMPRAR) return "Comprar";
  if (payload === LEAD_INTERESSE_ALUGAR) return "Alugar";
  if (payload === LEAD_INTERESSE_VENDER) return "Vender";

  const t = texto ? normalizar(texto) : "";
  if (!t) return null;
  if (t.includes("compr")) return "Comprar";
  if (t.includes("alug")) return "Alugar";
  if (t.includes("vend")) return "Vender";
  return null;
}

type ConfigLeads = {
  palavra_chave_lead: string | null;
  leads_habilitado: boolean;
  leads_perguntas_ativas: unknown;
  leads_admin_whatsapp: string | null;
};

async function buscarConfig(admin: Admin, accountId: string): Promise<ConfigLeads | null> {
  const { data, error } = await admin
    .from("chatbot_account_settings")
    .select("palavra_chave_lead, leads_habilitado, leads_perguntas_ativas, leads_admin_whatsapp")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    console.error("Falha ao buscar configuração de leads da conta:", error);
    return null;
  }
  return data;
}

function perguntasAtivas(config: ConfigLeads | null): IdDePergunta[] {
  const lista = Array.isArray(config?.leads_perguntas_ativas) ? (config!.leads_perguntas_ativas as string[]) : [];
  return ORDEM_PADRAO.filter((id) => lista.includes(id));
}

/**
 * Ponto de entrada, chamado pelo webhook (via decidirEResponder) ANTES da checagem de palavra-
 * chave comum e do Gemini — mesma posição na fila que processarMensagemDeReserva. Devolve `true`
 * quando tratou a mensagem de verdade (o webhook registra como atendimento), `false` quando não
 * tem nada a ver com lead (webhook segue pro caminho normal) OU quando a mensagem não tinha
 * conteúdo nenhum pra responder (áudio/figurinha/reação — não deve contar como atendimento).
 */
export async function processarMensagemDeLead(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  mensagem: any
): Promise<boolean> {
  const textoDaMensagem: string | undefined = typeof mensagem?.text === "string" ? mensagem.text : undefined;
  const payloadDoBotao: string | undefined = mensagem?.quick_reply?.payload;

  const config = await buscarConfig(admin, conta.id);
  if (!config?.leads_habilitado) return false;

  const variacoesDaPalavraChave = (config.palavra_chave_lead ?? "")
    .split(",")
    .map((v) => normalizar(v.trim()))
    .filter((v) => v.length > 0);

  const bateuPalavraChave =
    variacoesDaPalavraChave.length > 0 &&
    !!textoDaMensagem &&
    variacoesDaPalavraChave.some((variacao) => normalizar(textoDaMensagem).includes(variacao));

  const { data: conversaEncontrada, error: erroAoBuscarConversa } = await admin
    .from("chatbot_conversations")
    .select("id, etapa_atual, dados_coletados, atualizado_em")
    .eq("account_id", conta.id)
    .eq("instagram_scoped_id", idDoCliente)
    .eq("fluxo_atual", "lead")
    .maybeSingle();

  if (erroAoBuscarConversa) throw erroAoBuscarConversa;

  let conversa = conversaEncontrada;

  if (
    conversa &&
    !bateuPalavraChave &&
    Date.now() - new Date(conversa.atualizado_em).getTime() > TIMEOUT_CONVERSA_ABANDONADA_MS
  ) {
    await admin.from("chatbot_conversations").delete().eq("id", conversa.id);
    conversa = null;
  }

  if (bateuPalavraChave) {
    if (conversa) {
      await admin.from("chatbot_conversations").delete().eq("id", conversa.id);
    }
    await iniciarFluxo(admin, conta, idDoCliente, config);
    return true;
  }

  if (conversa) {
    // Mesmo guard que a Reserva tem: mensagem sem texto nem payload (áudio, figurinha, reação)
    // chegando no meio do fluxo não é resposta nenhuma — ignora sem contar como atendimento.
    if (!textoDaMensagem && !payloadDoBotao) return false;

    await continuarFluxo(admin, conta, idDoCliente, conversa, config, textoDaMensagem, payloadDoBotao);
    return true;
  }

  return false;
}

async function iniciarFluxo(admin: Admin, conta: Conta, idDoCliente: string, config: ConfigLeads) {
  const perguntas = perguntasAtivas(config);

  if (perguntas.length === 0) {
    // Conta ativou Leads mas desligou as 5 perguntas todas — não tem o que perguntar. Fica em
    // silêncio em vez de abrir um fluxo que nunca termina.
    return;
  }

  await admin.from("chatbot_conversations").insert({
    account_id: conta.id,
    instagram_scoped_id: idDoCliente,
    fluxo_atual: "lead",
    etapa_atual: perguntas[0],
    dados_coletados: {},
    atualizado_em: new Date().toISOString(),
  });

  await perguntar(conta, idDoCliente, perguntas[0]);
}

async function perguntar(conta: Conta, idDoCliente: string, idPergunta: IdDePergunta) {
  const texto = DEFINICAO_DAS_PERGUNTAS[idPergunta].pergunta;

  if (idPergunta === "interesse") {
    await enviarMensagemComBotoes(conta.access_token, idDoCliente, texto, [
      { titulo: "Comprar", payload: LEAD_INTERESSE_COMPRAR },
      { titulo: "Alugar", payload: LEAD_INTERESSE_ALUGAR },
      { titulo: "Vender", payload: LEAD_INTERESSE_VENDER },
    ]);
    return;
  }

  await enviarMensagemDirect(conta.access_token, idDoCliente, texto);
}

async function continuarFluxo(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  conversa: { id: string; etapa_atual: string; dados_coletados: any },
  config: ConfigLeads,
  textoDaMensagem: string | undefined,
  payloadDoBotao: string | undefined
) {
  const dados = conversa.dados_coletados ?? {};

  // Mesma proteção contra reentrega/duplo-toque que a Reserva usa (ver comentário detalhado em
  // reservas.ts/continuarFluxo) — reaproveita a MESMA função no banco, que trava por conversa_id,
  // então funciona igual aqui sem precisar de nenhuma mudança na function em si.
  const JANELA_DUPLICATA_SEGUNDOS = 30;
  const assinaturaDestaMensagem = payloadDoBotao ?? normalizar((textoDaMensagem ?? "").trim());

  if (assinaturaDestaMensagem) {
    const { data: assinaturaMarcada, error: erroAoMarcarAssinatura } = await admin.rpc(
      "chatbot_marcar_assinatura_processada",
      {
        p_conversa_id: conversa.id,
        p_assinatura: assinaturaDestaMensagem,
        p_janela_segundos: JANELA_DUPLICATA_SEGUNDOS,
      }
    );

    if (erroAoMarcarAssinatura) throw erroAoMarcarAssinatura;
    if (!assinaturaMarcada) return;
  }

  if (!payloadDoBotao && ehPedidoDeCancelamento(textoDaMensagem)) {
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Sem problema, encerrei por aqui. Se quiser retomar depois, é só chamar de novo."
    );
    await encerrarConversa(admin, conversa.id);
    return;
  }

  const etapaAtual = conversa.etapa_atual as IdDePergunta;
  const perguntas = perguntasAtivas(config);

  let valor: string | null = null;
  if (etapaAtual === "interesse") {
    valor = interpretarInteresse(payloadDoBotao, textoDaMensagem);
    if (!valor) {
      await enviarMensagemDirect(
        conta.access_token,
        idDoCliente,
        "Não entendi — é pra comprar, alugar ou vender?" + SUGESTAO_DE_CANCELAR
      );
      return;
    }
  } else {
    valor = textoDaMensagem?.trim() || null;
    if (!valor) {
      await enviarMensagemDirect(
        conta.access_token,
        idDoCliente,
        "Não consegui entender — pode responder só com texto?" + SUGESTAO_DE_CANCELAR
      );
      return;
    }
  }

  dados[etapaAtual] = valor;

  const indiceAtual = perguntas.indexOf(etapaAtual);
  const proximaPergunta = perguntas[indiceAtual + 1];

  if (proximaPergunta) {
    await atualizarEtapa(admin, conversa.id, proximaPergunta, dados);
    await perguntar(conta, idDoCliente, proximaPergunta);
    return;
  }

  // Última pergunta respondida — grava o lead, avisa o cliente e notifica o responsável.
  await finalizarLead(admin, conta, idDoCliente, dados);
  await encerrarConversa(admin, conversa.id);
}

async function finalizarLead(admin: Admin, conta: Conta, idDoCliente: string, dados: any) {
  const perfil = await buscarPerfilDoCliente(conta.access_token, idDoCliente);

  const { data: leadSalvo, error } = await admin
    .from("chatbot_leads")
    .insert({
      account_id: conta.id,
      instagram_scoped_id: idDoCliente,
      cliente_nome: perfil.nome,
      cliente_instagram_username: perfil.username,
      interesse: dados.interesse ?? null,
      tipo_imovel: dados.tipo ?? null,
      regiao: dados.regiao ?? null,
      faixa_preco: dados.preco ?? null,
      quartos: dados.quartos ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao salvar lead no banco:", error);
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Deu um probleminha aqui pra registrar seu interesse — pode tentar de novo em alguns minutos? Se persistir, chama a gente direto."
    );
    return;
  }

  await enviarMensagemDirect(
    conta.access_token,
    idDoCliente,
    "Perfeito, anotei tudo! Já vou passar isso pro nosso time — alguém entra em contato com você em breve."
  );

  await notificarNovoLead(admin, conta.id, perfil.nome, dados, leadSalvo?.id);
}
