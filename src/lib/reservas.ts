import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  buscarPerfilDoCliente,
  enviarMensagemDirect,
  enviarMensagemComBotoes,
} from "@/lib/metaMessaging";
import { adicionarLinhaNaPlanilha } from "@/lib/googleSheets";
import { notificarNovaReserva, notificarLotacaoAtingida } from "@/lib/webPush";

// Etapa 6 — fluxo de reserva com estado: a conta responde normal (palavra-chave, Gemini) até
// alguém escrever a palavra-chave configurada em `palavra_chave_reserva`. Daí em diante, cada
// mensagem nova dessa pessoa é tratada como resposta da pergunta atual (nunca cai em
// palavra-chave/Gemini até o fluxo terminar) — o estado de "em que pergunta a pessoa está" fica
// guardado em `chatbot_conversations`, e a reserva confirmada vira uma linha em
// `chatbot_reservations` + uma linha na planilha do Google.
//
// Todas as mensagens fixas do fluxo (saudação inicial e as perguntas de cada etapa, além das
// mensagens de reserva confirmada/recusada) podem ser personalizadas por conta em
// `chatbot_account_settings` (campos `reserva_msg_*`) — se a conta não configurou nada, cai no
// texto padrão de sempre (mesmo comportamento de antes dessa personalização existir).

type Admin = ReturnType<typeof criarClienteAdmin>;
type Conta = { id: string; access_token: string };

const RESERVA_DATA_HOJE = "RESERVA_DATA_HOJE";
const RESERVA_DATA_AMANHA = "RESERVA_DATA_AMANHA";
const RESERVA_DATA_OUTRO = "RESERVA_DATA_OUTRO";
const RESERVA_PERIODO_ALMOCO = "RESERVA_PERIODO_ALMOCO";
const RESERVA_PERIODO_JANTAR = "RESERVA_PERIODO_JANTAR";
const RESERVA_CONFIRMAR_SIM = "RESERVA_CONFIRMAR_SIM";
const RESERVA_CONFIRMAR_NAO = "RESERVA_CONFIRMAR_NAO";

// Se o cliente sumir no meio do fluxo (não responde mais) e voltar dias depois falando de outra
// coisa, sem isso ele ficaria PRA SEMPRE preso no fluxo de reserva — toda mensagem nova dele seria
// interpretada como resposta da pergunta parada (data/período/etc.), o bot nunca mais cairia em
// palavra-chave normal nem no Gemini pra essa pessoa. Passado esse tempo sem nenhuma resposta,
// trata como abandonada: apaga o estado e deixa a mensagem nova seguir pro caminho normal.
const TIMEOUT_CONVERSA_ABANDONADA_MS = 60 * 60 * 1000;

// Anexada em toda mensagem de "não entendi" do fluxo — deixa claro que dá pra sair a qualquer
// momento (ver `ehPedidoDeCancelamento`), em vez de só repetir a pergunta sem dar opção nenhuma
// pra quem mudou de ideia ou perguntou outra coisa sem querer mais continuar a reserva.
const SUGESTAO_DE_CANCELAR = ' Se preferir, digite "cancelar" pra encerrar essa reserva.';

// Palavras que, junto com a palavra-chave de reserva (ex: "reserva"), indicam que a pessoa já TEM
// uma reserva e quer mexer nela — não fazer uma nova. Usado só como ponto de partida (a conta pode
// personalizar em `palavra_chave_alterar_reserva`); precisa bater ISSO **e** a palavra-chave normal
// de reserva pra não confundir com "quero fazer uma reserva".
const PALAVRAS_ALTERACAO_PADRAO = "mudar,alterar,trocar,editar,aumentar,diminuir,adicionar,remover";

// Só dá pra mudar a QUANTIDADE de pessoas, nunca a data (reportado como decisão de negócio: se a
// pessoa quiser outro dia, tem que fazer uma reserva nova) — e só até um horário de corte no dia da
// própria reserva (depois disso, ela avisa a equipe direto na chegada).

/**
 * Ponto de entrada, chamado pelo webhook ANTES da checagem de palavra-chave comum. Devolve
 * `true` quando tratou a mensagem (o webhook para por ali), `false` quando não tem nada a ver
 * com reserva (o webhook segue pro caminho normal de palavra-chave/Gemini).
 */
export async function processarMensagemDeReserva(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  mensagem: any
): Promise<boolean> {
  const textoDaMensagem: string | undefined =
    typeof mensagem?.text === "string" ? mensagem.text : undefined;
  const payloadDoBotao: string | undefined = mensagem?.quick_reply?.payload;

  const { data: config, error: erroAoBuscarConfig } = await admin
    .from("chatbot_account_settings")
    .select(
      "palavra_chave_reserva, reserva_habilitada, reserva_pausa_ativa, reserva_pausa_mensagem, reserva_cutoff_horario, reserva_msg_inicial, reserva_msg_pergunta_data, reserva_datas_bloqueadas, palavra_chave_alterar_reserva, alteracao_cutoff_horario"
    )
    .eq("account_id", conta.id)
    .maybeSingle();

  if (erroAoBuscarConfig) throw erroAoBuscarConfig;

  // O campo "Palavra-chave da Reserva" aceita várias variações separadas por vírgula (ex: "reserva,
  // reservas, reservar") — igual ao campo de palavra-chave normal da aba Palavras-chave. Cada
  // variação é comparada separadamente contra a mensagem; basta UMA bater pra iniciar o fluxo.
  //
  // `reserva_habilitada` é o interruptor geral da função (botão "Ativar/Desativar reservas" em
  // /contas) — nem toda página conectada vai usar reserva, então desligada aqui bloqueia o início
  // do fluxo mesmo que uma palavra-chave tenha ficado configurada de antes.
  const variacoesDaPalavraChaveDeReserva = config?.reserva_habilitada
    ? (config?.palavra_chave_reserva ?? "")
        .split(",")
        .map((v: string) => normalizar(v.trim()))
        .filter((v: string) => v.length > 0)
    : [];

  const bateuPalavraChave =
    variacoesDaPalavraChaveDeReserva.length > 0 &&
    !!textoDaMensagem &&
    variacoesDaPalavraChaveDeReserva.some((variacao: string) => normalizar(textoDaMensagem).includes(variacao));

  // Intenção de ALTERAR uma reserva já existente (ex: "quero mudar minha reserva pra 9 pessoas") —
  // precisa bater a palavra-chave de reserva E uma palavra de alteração ao mesmo tempo, senão
  // "quero fazer uma reserva" (bate só a primeira) seria confundido com isso.
  const variacoesDeAlteracao = config?.reserva_habilitada
    ? (config?.palavra_chave_alterar_reserva || PALAVRAS_ALTERACAO_PADRAO)
        .split(",")
        .map((v: string) => normalizar(v.trim()))
        .filter((v: string) => v.length > 0)
    : [];

  const bateuIntencaoDeAlterar =
    variacoesDeAlteracao.length > 0 &&
    bateuPalavraChave &&
    !!textoDaMensagem &&
    variacoesDeAlteracao.some((variacao: string) => normalizar(textoDaMensagem).includes(variacao));

  const { data: conversaEncontrada, error: erroAoBuscarConversa } = await admin
    .from("chatbot_conversations")
    .select("id, fluxo_atual, etapa_atual, dados_coletados, atualizado_em")
    .eq("account_id", conta.id)
    .eq("instagram_scoped_id", idDoCliente)
    .in("fluxo_atual", ["reserva", "alterar_reserva"])
    .maybeSingle();

  if (erroAoBuscarConversa) throw erroAoBuscarConversa;

  let conversa = conversaEncontrada;
  const bateuAlgumaPalavraChave = bateuPalavraChave || bateuIntencaoDeAlterar;

  if (
    conversa &&
    !bateuAlgumaPalavraChave &&
    Date.now() - new Date(conversa.atualizado_em).getTime() > TIMEOUT_CONVERSA_ABANDONADA_MS
  ) {
    await admin.from("chatbot_conversations").delete().eq("id", conversa.id);
    conversa = null;
  }

  // Checada ANTES da palavra-chave de reserva normal: como "mudar minha reserva" também contém a
  // palavra "reserva", sem essa prioridade o código abaixo recomeçaria uma reserva NOVA do zero em
  // vez de editar a que já existe.
  if (bateuIntencaoDeAlterar && conversa?.fluxo_atual !== "alterar_reserva") {
    if (conversa) {
      await admin.from("chatbot_conversations").delete().eq("id", conversa.id);
    }
    await iniciarFluxoDeAlteracao(admin, conta, idDoCliente, config?.alteracao_cutoff_horario ?? null);
    return true;
  }

  if (bateuPalavraChave) {
    // Bateu a palavra-chave — começa (ou recomeça do zero, se já tinha uma reserva pela metade;
    // ex: a pessoa desistiu e quer começar de novo).
    if (conversa) {
      await admin.from("chatbot_conversations").delete().eq("id", conversa.id);
    }

    if (config?.reserva_pausa_ativa) {
      const mensagemDePausa =
        config.reserva_pausa_mensagem?.trim() ||
        "No momento não estamos aceitando novas reservas por aqui. Assim que reabrirmos, avisamos por aqui.";
      await enviarMensagemDirect(conta.access_token, idDoCliente, mensagemDePausa);
      return true;
    }

    await iniciarFluxo(
      admin,
      conta,
      idDoCliente,
      config?.reserva_cutoff_horario ?? null,
      config?.reserva_msg_inicial ?? null,
      config?.reserva_msg_pergunta_data ?? null,
      config?.reserva_datas_bloqueadas ?? null
    );
    return true;
  }

  if (conversa?.fluxo_atual === "alterar_reserva") {
    await continuarFluxoDeAlteracao(admin, conta, idDoCliente, conversa, textoDaMensagem);
    return true;
  }

  if (conversa?.fluxo_atual === "reserva") {
    await continuarFluxo(admin, conta, idDoCliente, conversa, textoDaMensagem, payloadDoBotao);
    return true;
  }

  return false;
}

/**
 * Fluxo separado (mais curto) pra quando o cliente já tem uma reserva e quer só mudar a
 * quantidade de pessoas — nunca a data (decisão de negócio: outro dia é reserva nova). Assume que
 * a pessoa tem no máximo UMA reserva futura em aberto (confirmado que é sempre assim na prática) e
 * pega a mais próxima; se um dia isso deixar de ser verdade, o pior caso é editar a reserva errada
 * (mais próxima) em vez de travar — aceitável, e visível no log de alterações.
 */
async function iniciarFluxoDeAlteracao(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  cutoffAlteracao: string | null
) {
  const agora = agoraEmSaoPaulo();
  const hojeISO = paraISO(agora);

  const { data: reserva, error: erroAoBuscarReserva } = await admin
    .from("chatbot_reservations")
    .select("id, data_reserva, periodo, quantidade_pessoas")
    .eq("account_id", conta.id)
    .eq("instagram_scoped_id", idDoCliente)
    .gte("data_reserva", hojeISO)
    .order("data_reserva", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (erroAoBuscarReserva) {
    console.error("Falha ao buscar reserva pra alteração:", erroAoBuscarReserva);
  }

  if (!reserva) {
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Não encontrei nenhuma reserva em aberto no seu nome por aqui. Se quiser fazer uma nova, é só chamar."
    );
    return;
  }

  const ehHoje = reserva.data_reserva === hojeISO;
  if (ehHoje && passouDoCutoff(cutoffAlteracao, agora.hora, agora.minuto)) {
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Não dá mais pra alterar a quantidade de pessoas por aqui pra hoje — pode avisar a equipe direto na chegada."
    );
    return;
  }

  await admin.from("chatbot_conversations").insert({
    account_id: conta.id,
    instagram_scoped_id: idDoCliente,
    fluxo_atual: "alterar_reserva",
    etapa_atual: "aguardando_quantidade",
    dados_coletados: { reservaId: reserva.id, quantidadeAtual: reserva.quantidade_pessoas ?? 0 },
    atualizado_em: new Date().toISOString(),
  });

  const dataFormatada = formatarDataBR(paraDataSimplesDeISO(reserva.data_reserva));
  const periodoTexto = reserva.periodo === "almoco" ? " (almoço)" : reserva.periodo === "jantar" ? " (jantar)" : "";

  await enviarMensagemDirect(
    conta.access_token,
    idDoCliente,
    `Sua reserva de ${dataFormatada}${periodoTexto} está pra ${reserva.quantidade_pessoas ?? "?"} pessoa(s). ` +
      `Pra quantas pessoas você quer mudar?` +
      SUGESTAO_DE_CANCELAR
  );
}

async function continuarFluxoDeAlteracao(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  conversa: { id: string; dados_coletados: any },
  textoDaMensagem: string | undefined
) {
  if (ehPedidoDeCancelamento(textoDaMensagem)) {
    await enviarMensagemDirect(conta.access_token, idDoCliente, "Sem problema, não mudei nada na sua reserva.");
    await encerrarConversa(admin, conversa.id);
    return;
  }

  const novaQuantidade = interpretarQuantidade(textoDaMensagem);
  if (!novaQuantidade) {
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Não consegui entender — pode me dizer só o número de pessoas?" + SUGESTAO_DE_CANCELAR
    );
    return;
  }

  const dados = conversa.dados_coletados ?? {};
  const { error: erroAoAtualizar } = await admin
    .from("chatbot_reservations")
    .update({ quantidade_pessoas: novaQuantidade })
    .eq("id", dados.reservaId);

  if (erroAoAtualizar) {
    console.error("Falha ao atualizar quantidade de pessoas da reserva:", erroAoAtualizar);
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Deu um probleminha aqui pra atualizar sua reserva — pode tentar de novo em alguns minutos? Se persistir, chama a gente direto."
    );
    return;
  }

  const quantidadeAnterior = dados.quantidadeAtual ?? novaQuantidade;
  await ajustarTotalAcumulado(admin, conta.id, 0, novaQuantidade - quantidadeAnterior);

  await enviarMensagemDirect(
    conta.access_token,
    idDoCliente,
    `Prontinho, atualizei sua reserva pra ${novaQuantidade} pessoa(s).`
  );
  await encerrarConversa(admin, conversa.id);
}

/**
 * Soma incremental do total acumulado (ver função `incrementar_reserva_totais_acumulados` no
 * banco) — nunca deixa esse ajuste quebrar o fluxo de reserva se falhar por qualquer motivo (é só
 * um contador pra tela de estatísticas, não afeta a reserva em si).
 */
async function ajustarTotalAcumulado(
  admin: Admin,
  accountId: string,
  deltaReservas: number,
  deltaPessoas: number
): Promise<void> {
  const { error } = await admin.rpc("incrementar_reserva_totais_acumulados", {
    p_account_id: accountId,
    p_delta_reservas: deltaReservas,
    p_delta_pessoas: deltaPessoas,
    p_atualizado_em: paraISO(agoraEmSaoPaulo()),
  });

  if (error) {
    console.error("Falha ao ajustar total acumulado de reservas:", error);
  }
}

async function iniciarFluxo(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  cutoff: string | null,
  mensagemInicial: string | null,
  mensagemPerguntaData: string | null,
  datasBloqueadasTexto: string | null
) {
  const perfil = await buscarPerfilDoCliente(conta.access_token, idDoCliente);

  await admin.from("chatbot_conversations").insert({
    account_id: conta.id,
    instagram_scoped_id: idDoCliente,
    fluxo_atual: "reserva",
    etapa_atual: "data",
    dados_coletados: { nome: perfil.nome, username: perfil.username },
    atualizado_em: new Date().toISOString(),
  });

  // Saudação inicial — só existe se a conta tiver configurado uma (campo opcional). Sem ela, o
  // fluxo começa direto na pergunta da data, exatamente como sempre funcionou.
  const saudacao = mensagemInicial?.trim();
  if (saudacao) {
    await enviarMensagemDirect(conta.access_token, idDoCliente, saudacao);
  }

  await perguntarData(conta, idDoCliente, cutoff, mensagemPerguntaData, datasBloqueadasTexto);
}

async function perguntarData(
  conta: Conta,
  idDoCliente: string,
  cutoff: string | null,
  mensagemPergunta?: string | null,
  datasBloqueadasTexto?: string | null
) {
  const agora = agoraEmSaoPaulo();
  const hojeFechadoPorHorario = passouDoCutoff(cutoff, agora.hora, agora.minuto);

  // Além do corte por horário, algumas datas específicas podem estar bloqueadas de propósito
  // (ex: feriado, dia fechado) — cadastradas em `reserva_datas_bloqueadas`. Se Hoje ou Amanhã
  // caírem numa data bloqueada, o botão correspondente nem aparece.
  const datasBloqueadas = datasBloqueadasTexto ? parseDatasBloqueadas(datasBloqueadasTexto) : null;
  const hojeBloqueadoPorData = !!datasBloqueadas?.has(paraISO(agora));
  const amanhaBloqueadaPorData = !!datasBloqueadas?.has(paraISO(somarDias(agora, 1)));

  const esconderHoje = hojeFechadoPorHorario || hojeBloqueadoPorData;
  const esconderAmanha = amanhaBloqueadaPorData;

  const botoes = [
    ...(esconderHoje ? [] : [{ titulo: "Hoje", payload: RESERVA_DATA_HOJE }]),
    ...(esconderAmanha ? [] : [{ titulo: "Amanhã", payload: RESERVA_DATA_AMANHA }]),
    { titulo: "Outro dia", payload: RESERVA_DATA_OUTRO },
  ];

  const opcoesTexto = botoes.map((b) => b.titulo).join(", ");
  const aviso = hojeFechadoPorHorario
    ? "Nossas reservas de hoje já encerraram, mas posso te ajudar pra outro dia. "
    : "";

  const perguntaBase =
    mensagemPergunta?.trim() ||
    `Pra qual dia você quer reservar? Toque num botão abaixo ou digite: ${opcoesTexto}.`;

  await enviarMensagemComBotoes(conta.access_token, idDoCliente, `${aviso}${perguntaBase}`, botoes);
}

async function perguntarPeriodo(conta: Conta, idDoCliente: string, mensagemPergunta?: string | null) {
  const texto = mensagemPergunta?.trim() || "É pro Almoço ou Jantar?";

  await enviarMensagemComBotoes(conta.access_token, idDoCliente, texto, [
    { titulo: "Almoço", payload: RESERVA_PERIODO_ALMOCO },
    { titulo: "Jantar", payload: RESERVA_PERIODO_JANTAR },
  ]);
}

async function continuarFluxo(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  conversa: { id: string; etapa_atual: string; dados_coletados: any },
  textoDaMensagem: string | undefined,
  payloadDoBotao: string | undefined
) {
  const dados = conversa.dados_coletados ?? {};

  // Proteção contra a Meta reentregando o MESMO toque/mensagem do cliente duas vezes com um ID de
  // mensagem diferente cada vez (por isso o dedup por message_id, lá no webhook, não pega esse
  // caso — o ID em si já vem diferente). Sintoma visto na prática: o botão "Posso confirmar?"
  // chegando duplicado pro cliente, sem ele ter feito nada duas vezes. Guarda a "assinatura" (o
  // payload do botão, ou o texto digitado) da última mensagem já processada dessa conversa junto
  // com o horário; se a mensagem que chegou agora é IDÊNTICA à de poucos segundos atrás, é quase
  // certeza que é a mesma entrega da Meta duplicada — ignora, sem reprocessar nem mandar nada de
  // novo. Isso também tem o efeito colateral bom de proteger contra o próprio cliente dando duplo
  // toque sem querer no botão (por exemplo, evita criar a reserva duas vezes se ele tocar "Sim"
  // duas vezes rápido).
  const JANELA_DUPLICATA_MS = 30_000;
  const assinaturaDestaMensagem = payloadDoBotao ?? normalizar((textoDaMensagem ?? "").trim());
  const agora = Date.now();
  const ultimaProcessada = dados.__ultimaMensagemProcessada as
    | { assinatura: string; em: number }
    | undefined;

  if (
    assinaturaDestaMensagem &&
    ultimaProcessada &&
    ultimaProcessada.assinatura === assinaturaDestaMensagem &&
    agora - ultimaProcessada.em < JANELA_DUPLICATA_MS
  ) {
    return;
  }

  dados.__ultimaMensagemProcessada = { assinatura: assinaturaDestaMensagem, em: agora };
  await admin
    .from("chatbot_conversations")
    .update({ dados_coletados: dados, atualizado_em: new Date().toISOString() })
    .eq("id", conversa.id);

  // Deixa a pessoa desistir a qualquer momento do fluxo (menos na etapa de confirmação final, que
  // já trata "cancelar"/"não" com sua própria mensagem configurável de recusa, via
  // `interpretarSimNao` mais abaixo) — sem isso, quem decidisse não querer mais reservar no meio
  // do caminho ficaria preso respondendo pergunta que não quer mais responder, sem nenhum jeito de
  // sair a não ser esperar o fluxo expirar sozinho (1h) ou terminar à força.
  if (
    conversa.etapa_atual !== "confirmacao" &&
    !payloadDoBotao &&
    ehPedidoDeCancelamento(textoDaMensagem)
  ) {
    const { data: config } = await buscarConfig(admin, conta.id);
    const mensagemCancelada =
      config?.reserva_msg_recusada?.trim() ||
      "Sem problema, cancelei a reserva por aqui. Se quiser começar de novo, é só chamar.";
    await enviarMensagemDirect(conta.access_token, idDoCliente, mensagemCancelada);
    await encerrarConversa(admin, conversa.id);
    return;
  }

  switch (conversa.etapa_atual) {
    case "data": {
      const { data: config } = await buscarConfig(admin, conta.id);
      const agora = agoraEmSaoPaulo();
      const hojeFechado = passouDoCutoff(config?.reserva_cutoff_horario ?? null, agora.hora, agora.minuto);

      const escolha = interpretarData(payloadDoBotao, textoDaMensagem, hojeFechado);

      if (escolha === "invalido") {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          (hojeFechado
            ? "Não entendi — pode ser Amanhã ou Outro dia?"
            : "Não entendi — pode ser Hoje, Amanhã ou Outro dia?") + SUGESTAO_DE_CANCELAR
        );
        return;
      }

      if (escolha === "outro") {
        await atualizarEtapa(admin, conversa.id, "data_customizada", dados);
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Beleza, pra qual data? Pode escrever tipo 15/09."
        );
        return;
      }

      const dataEscolhida = escolha === "hoje" ? agora : somarDias(agora, 1);
      const dataEscolhidaISO = paraISO(dataEscolhida);

      if (estaBloqueada(dataEscolhidaISO, config?.reserva_datas_bloqueadas)) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não estamos aceitando reservas nesse dia — pode escolher outra data?"
        );
        // Pergunta de novo, já com os botões atualizados (Hoje/Amanhã somem se também
        // estiverem bloqueados) — assim a pessoa não bate na mesma data de novo sem querer.
        await perguntarData(
          conta,
          idDoCliente,
          config?.reserva_cutoff_horario ?? null,
          config?.reserva_msg_pergunta_data,
          config?.reserva_datas_bloqueadas
        );
        return;
      }

      dados.data_reserva = dataEscolhidaISO;
      dados.data_reserva_br = formatarDataBR(dataEscolhida);
      await atualizarEtapa(admin, conversa.id, "periodo", dados);
      await perguntarPeriodo(conta, idDoCliente, config?.reserva_msg_pergunta_periodo);
      return;
    }

    case "data_customizada": {
      const { data: config } = await buscarConfig(admin, conta.id);
      const agora = agoraEmSaoPaulo();
      const dataLivre = textoDaMensagem ? parseDataLivre(textoDaMensagem, agora) : null;

      if (!dataLivre) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não consegui entender essa data — pode escrever no formato dia/mês, tipo 15/09?" +
            SUGESTAO_DE_CANCELAR
        );
        return;
      }

      const dataLivreISO = paraISO(dataLivre);

      if (estaBloqueada(dataLivreISO, config?.reserva_datas_bloqueadas)) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não estamos aceitando reservas nesse dia — pode tentar outra data?"
        );
        return;
      }

      dados.data_reserva = dataLivreISO;
      dados.data_reserva_br = formatarDataBR(dataLivre);
      await atualizarEtapa(admin, conversa.id, "periodo", dados);
      await perguntarPeriodo(conta, idDoCliente, config?.reserva_msg_pergunta_periodo);
      return;
    }

    case "periodo": {
      const periodo = interpretarPeriodo(payloadDoBotao, textoDaMensagem);
      if (!periodo) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não entendi — é pro Almoço ou Jantar?" + SUGESTAO_DE_CANCELAR
        );
        return;
      }
      dados.periodo = periodo;
      await atualizarEtapa(admin, conversa.id, "pessoas", dados);

      const { data: config } = await buscarConfig(admin, conta.id);
      const perguntaPessoas = config?.reserva_msg_pergunta_pessoas?.trim() || "Pra quantas pessoas é a reserva?";
      await enviarMensagemDirect(conta.access_token, idDoCliente, perguntaPessoas);
      return;
    }

    case "pessoas": {
      const quantidade = interpretarQuantidade(textoDaMensagem);
      if (!quantidade) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não consegui entender — pode me dizer só o número de pessoas?" + SUGESTAO_DE_CANCELAR
        );
        return;
      }

      const { data: config } = await buscarConfig(admin, conta.id);
      const limiteMaximo = limiteMaximoDoPeriodo(config, dados.periodo);

      if (typeof limiteMaximo === "number") {
        // Capacidade é por dia+período, cada período com o próprio limite configurável (almoço e
        // jantar podem ter números diferentes agora — ver limiteMaximoDoPeriodo) — soma quem já
        // está confirmado em chatbot_reservations pra essa data+período MAIS a quantidade que essa
        // pessoa está pedindo agora. Recusa mesmo que ninguém tenha reservado ainda, se só o
        // pedido dela já estourar o limite sozinho.
        const jaReservado = await somaPessoasReservadas(admin, conta.id, dados.data_reserva, dados.periodo);

        if (jaReservado + quantidade > limiteMaximo) {
          const mensagem =
            config?.reserva_mensagem_limite_maximo?.trim() ||
            "Nossas reservas do dia já estão encerradas porque todas as mesas já foram preenchidas. Nosso atendimento será apenas por ordem de chegada.";
          await enviarMensagemDirect(conta.access_token, idDoCliente, mensagem);
          await encerrarConversa(admin, conversa.id);
          return;
        }
      }

      dados.quantidade_pessoas = quantidade;
      await atualizarEtapa(admin, conversa.id, "whatsapp", dados);

      const perguntaWhatsapp = config?.reserva_msg_pergunta_whatsapp?.trim() || "Qual o melhor WhatsApp pra contato?";
      await enviarMensagemDirect(conta.access_token, idDoCliente, perguntaWhatsapp);
      return;
    }

    case "whatsapp": {
      const whatsapp = textoDaMensagem?.trim();
      const digitos = whatsapp?.replace(/\D/g, "") ?? "";

      if (!whatsapp || digitos.length < 8) {
        await enviarMensagemDirect(
          conta.access_token,
          idDoCliente,
          "Não consegui entender — pode mandar o número de WhatsApp, com DDD?" + SUGESTAO_DE_CANCELAR
        );
        return;
      }

      dados.whatsapp = whatsapp;
      await atualizarEtapa(admin, conversa.id, "confirmacao", dados);

      const { data: config } = await buscarConfig(admin, conta.id);
      const regras = config?.reserva_regras_texto?.trim();
      const periodoTexto = dados.periodo === "almoco" ? "almoço" : "jantar";

      // As Regras (texto livre, cadastrado por conta — pode ser bem longo) e o resumo da reserva
      // vão numa mensagem de texto simples, SEPARADA da mensagem com botão — mandar tudo junto
      // (resumo + pergunta + botões) deixava o resumo meio escondido/espremido dentro da mensagem
      // de botão. Assim o resumo aparece bem visível, e a mensagem com botão fica só com a
      // pergunta curta.
      if (regras) {
        await enviarMensagemDirect(conta.access_token, idDoCliente, regras);
      }

      await enviarMensagemDirect(
        conta.access_token,
        idDoCliente,
        `📋 Confirmando:\n${dados.quantidade_pessoas} pessoa(s), dia ${dados.data_reserva_br}, ${periodoTexto}.`
      );

      await enviarMensagemComBotoes(conta.access_token, idDoCliente, "Posso confirmar?", [
        { titulo: "Sim, confirmar", payload: RESERVA_CONFIRMAR_SIM },
        { titulo: "Não, cancelar", payload: RESERVA_CONFIRMAR_NAO },
      ]);
      return;
    }

    case "confirmacao": {
      const confirmou = interpretarSimNao(payloadDoBotao, textoDaMensagem);

      if (confirmou === null) {
        // Resposta não reconhecida — reenvia só os botões de novo (sem repetir texto explicando,
        // já que os botões já deixam claro o que fazer).
        await enviarMensagemComBotoes(conta.access_token, idDoCliente, "Posso confirmar?", [
          { titulo: "Sim, confirmar", payload: RESERVA_CONFIRMAR_SIM },
          { titulo: "Não, cancelar", payload: RESERVA_CONFIRMAR_NAO },
        ]);
        return;
      }

      if (!confirmou) {
        const { data: config } = await buscarConfig(admin, conta.id);
        const mensagemRecusada =
          config?.reserva_msg_recusada?.trim() ||
          "Sem problema, fica pra próxima! Se quiser reservar depois, é só chamar de novo.";
        await enviarMensagemDirect(conta.access_token, idDoCliente, mensagemRecusada);
        await encerrarConversa(admin, conversa.id);
        return;
      }

      await finalizarReserva(admin, conta, idDoCliente, dados);
      await encerrarConversa(admin, conversa.id);
      return;
    }

    default: {
      // Etapa desconhecida (não deveria acontecer) — encerra o fluxo pra não travar a conversa
      // num estado sem saída.
      await encerrarConversa(admin, conversa.id);
      return;
    }
  }
}

async function finalizarReserva(admin: Admin, conta: Conta, idDoCliente: string, dados: any) {
  const { data: config } = await buscarConfig(admin, conta.id);

  // Confere a capacidade de novo aqui, bem antes de gravar — o cliente pode ter levado minutos
  // entre a pergunta da quantidade e essa confirmação final, e outra pessoa pode ter confirmado
  // uma reserva pro mesmo dia+período nesse meio tempo. Sem essa segunda checagem, dava pra
  // estourar o limite combinando duas reservas que passaram cada uma na checagem da etapa
  // "pessoas" só porque, na hora de cada uma, a outra ainda não tinha sido confirmada.
  const limiteMaximo = limiteMaximoDoPeriodo(config, dados.periodo);
  let jaReservado = 0;
  if (typeof limiteMaximo === "number" && dados.data_reserva && dados.periodo) {
    jaReservado = await somaPessoasReservadas(admin, conta.id, dados.data_reserva, dados.periodo);

    if (jaReservado + (dados.quantidade_pessoas ?? 0) > limiteMaximo) {
      const mensagem =
        config?.reserva_mensagem_limite_maximo?.trim() ||
        "Nossas reservas do dia já estão encerradas porque todas as mesas já foram preenchidas. Nosso atendimento será apenas por ordem de chegada.";
      await enviarMensagemDirect(conta.access_token, idDoCliente, mensagem);
      return;
    }
  }

  const { data: reservaSalva, error: erroAoSalvar } = await admin
    .from("chatbot_reservations")
    .insert({
      account_id: conta.id,
      instagram_scoped_id: idDoCliente,
      cliente_nome: dados.nome ?? null,
      cliente_instagram_username: dados.username ?? null,
      data_reserva: dados.data_reserva ?? null,
      periodo: dados.periodo ?? null,
      quantidade_pessoas: dados.quantidade_pessoas ?? null,
      whatsapp: dados.whatsapp ?? null,
      confirmado_em: new Date().toISOString(),
      sheet_sincronizado: false,
    })
    .select("id")
    .single();

  if (erroAoSalvar) {
    console.error("Falha ao salvar reserva no banco:", erroAoSalvar);
    await enviarMensagemDirect(
      conta.access_token,
      idDoCliente,
      "Deu um probleminha aqui pra registrar sua reserva — pode mandar de novo em alguns minutos? Se persistir, chama a gente direto."
    );
    return;
  }

  await ajustarTotalAcumulado(admin, conta.id, 1, dados.quantidade_pessoas ?? 0);
  await notificarNovaReserva(admin, conta.id, dados.nome ?? null, dados.data_reserva_br ?? null);

  // Essa reserva foi exatamente a que fez a soma bater (ou passar) o limite — as próximas
  // tentativas pra esse mesmo dia+período já são recusadas antes de chegar aqui (ver checagem
  // acima), então esse aviso dispara uma vez só, na hora certa, sem repetir a cada nova tentativa
  // recusada depois disso.
  if (
    typeof limiteMaximo === "number" &&
    dados.data_reserva &&
    dados.periodo &&
    jaReservado + (dados.quantidade_pessoas ?? 0) >= limiteMaximo
  ) {
    const periodoTexto = dados.periodo === "almoco" ? "Almoço" : dados.periodo === "jantar" ? "Jantar" : "Período";
    await notificarLotacaoAtingida(admin, conta.id, periodoTexto);
  }

  // Avisa o cliente ANTES de tentar escrever na planilha — a reserva já está garantida no banco
  // nesse ponto, então uma falha na planilha (rede, permissão) não pode virar um "não deu certo"
  // falso pro cliente.
  const mensagemConfirmada =
    config?.reserva_msg_confirmada?.trim() ||
    "Reserva confirmada! Te esperamos por lá. Qualquer mudança, é só chamar por aqui de novo.";
  await enviarMensagemDirect(conta.access_token, idDoCliente, mensagemConfirmada);

  const idDaPlanilha = config?.google_sheet_id;
  if (idDaPlanilha && reservaSalva) {
    const periodoTexto = dados.periodo === "almoco" ? "Almoço" : dados.periodo === "jantar" ? "Jantar" : "";

    const escreveuNaPlanilha = await adicionarLinhaNaPlanilha(idDaPlanilha, [
      dados.nome ?? "",
      dados.username ?? "",
      String(dados.quantidade_pessoas ?? ""),
      dados.whatsapp ?? "",
      dados.data_reserva_br ?? "",
      periodoTexto,
      formatarDataHoraBR(new Date()),
    ]);

    if (escreveuNaPlanilha) {
      await admin
        .from("chatbot_reservations")
        .update({ sheet_sincronizado: true })
        .eq("id", reservaSalva.id);
    }
  }
}

/**
 * Soma quantas pessoas já estão em reservas CONFIRMADAS (as únicas que existem em
 * chatbot_reservations — a tabela só recebe uma linha depois que o cliente confirma no fim do
 * fluxo) pra uma data+período específicos. Usada pra checar capacidade: o limite máximo
 * configurado é por dia+período (almoço e jantar contam à parte, cada um com o mesmo teto).
 */
async function somaPessoasReservadas(
  admin: Admin,
  accountId: string,
  dataReserva: string,
  periodo: string
): Promise<number> {
  const { data, error } = await admin
    .from("chatbot_reservations")
    .select("quantidade_pessoas")
    .eq("account_id", accountId)
    .eq("data_reserva", dataReserva)
    .eq("periodo", periodo);

  if (error) throw error;

  return (data ?? []).reduce((soma, linha) => soma + (linha.quantidade_pessoas ?? 0), 0);
}

/** Capacidade máxima pro período pedido — `reserva_limite_maximo` é o valor do Almoço (e também o
 * de fallback pro Jantar, se a conta ainda não configurou um valor separado pra ele em
 * `reserva_limite_maximo_jantar` — assim ninguém perde a capacidade que já tinha antes dessa
 * separação existir, só de não ter mexido na configuração ainda). */
function limiteMaximoDoPeriodo(
  config: { reserva_limite_maximo?: number | null; reserva_limite_maximo_jantar?: number | null } | null | undefined,
  periodo: string | undefined
): number | undefined {
  if (periodo === "jantar") {
    return config?.reserva_limite_maximo_jantar ?? config?.reserva_limite_maximo ?? undefined;
  }
  return config?.reserva_limite_maximo ?? undefined;
}

async function buscarConfig(admin: Admin, accountId: string) {
  const resultado = await admin
    .from("chatbot_account_settings")
    .select(
      "reserva_regras_texto, reserva_mensagem_limite_maximo, reserva_limite_maximo, reserva_limite_maximo_jantar, reserva_cutoff_horario, google_sheet_id, reserva_msg_inicial, reserva_msg_pergunta_data, reserva_msg_pergunta_periodo, reserva_msg_pergunta_pessoas, reserva_msg_pergunta_whatsapp, reserva_msg_confirmada, reserva_msg_recusada, reserva_datas_bloqueadas"
    )
    .eq("account_id", accountId)
    .maybeSingle();

  // Chamado em quase toda etapa do fluxo de reserva pra buscar cutoff/mensagens/regras — se essa
  // busca falhar (rede, RLS, etc.), quem chama nunca fica sabendo (só recebe `config: undefined` e
  // segue com os textos padrão). Antes isso passava em silêncio total; agora ao menos fica no log.
  if (resultado.error) {
    console.error("Falha ao buscar configuração de reserva da conta:", resultado.error);
  }

  return resultado;
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

// --- Interpretação de respostas (aceita clique no botão OU texto digitado, sempre) ---

function interpretarData(
  payload: string | undefined,
  texto: string | undefined,
  hojeFechado: boolean
): "hoje" | "amanha" | "outro" | "invalido" {
  if (payload === RESERVA_DATA_HOJE) return hojeFechado ? "invalido" : "hoje";
  if (payload === RESERVA_DATA_AMANHA) return "amanha";
  if (payload === RESERVA_DATA_OUTRO) return "outro";

  const t = texto ? normalizar(texto) : "";
  if (!t) return "invalido";
  if (!hojeFechado && t.includes("hoje")) return "hoje";
  if (t.includes("amanha")) return "amanha";
  if (t.includes("outro")) return "outro";
  return "invalido";
}

function interpretarPeriodo(payload: string | undefined, texto: string | undefined): "almoco" | "jantar" | null {
  if (payload === RESERVA_PERIODO_ALMOCO) return "almoco";
  if (payload === RESERVA_PERIODO_JANTAR) return "jantar";

  const t = texto ? normalizar(texto) : "";
  if (t.includes("almoc")) return "almoco";
  if (t.includes("jant")) return "jantar";
  return null;
}

function interpretarQuantidade(texto: string | undefined): number | null {
  if (!texto) return null;
  const match = texto.match(/\d+/);
  if (!match) return null;
  const numero = parseInt(match[0], 10);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/** Reconhece um pedido de desistência do fluxo de reserva, digitado livremente em qualquer etapa. */
function ehPedidoDeCancelamento(texto: string | undefined): boolean {
  const t = texto ? normalizar(texto.trim()) : "";
  if (!t) return false;
  return /^(cancelar|cancela|desistir|desisto|parar|encerrar|sair)\b/.test(t);
}

function interpretarSimNao(payload: string | undefined, texto: string | undefined): boolean | null {
  if (payload === RESERVA_CONFIRMAR_SIM) return true;
  if (payload === RESERVA_CONFIRMAR_NAO) return false;

  const t = texto ? normalizar(texto) : "";
  if (!t) return null;
  if (/^(sim|s|confirmo|confirmar|pode|isso|ok)\b/.test(t)) return true;
  if (/^(nao|n|cancela|cancelar)\b/.test(t)) return false;
  return null;
}

// --- Data/hora em São Paulo, sem depender de biblioteca externa ---

type DataSimples = { ano: number; mes: number; dia: number };

function agoraEmSaoPaulo(): DataSimples & { hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";

  return {
    ano: parseInt(obter("year"), 10),
    mes: parseInt(obter("month"), 10),
    dia: parseInt(obter("day"), 10),
    hora: parseInt(obter("hour"), 10),
    minuto: parseInt(obter("minute"), 10),
  };
}

function somarDias({ ano, mes, dia }: DataSimples, quantidade: number): DataSimples {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + quantidade);
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1, dia: data.getUTCDate() };
}

function paraISO({ ano, mes, dia }: DataSimples): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function paraDataSimplesDeISO(dataISO: string): DataSimples {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  return { ano, mes, dia };
}

function formatarDataBR({ ano, mes, dia }: DataSimples): string {
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

function formatarDataHoraBR(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function parseDataLivre(texto: string, hojeSP: DataSimples): DataSimples | null {
  const match = texto.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (!match) return null;

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  let ano = hojeSP.ano;
  if (match[3]) {
    ano = parseInt(match[3], 10);
    if (match[3].length === 2) ano += 2000;
  } else {
    const candidata = new Date(Date.UTC(ano, mes - 1, dia));
    const hoje = new Date(Date.UTC(hojeSP.ano, hojeSP.mes - 1, hojeSP.dia));
    if (candidata < hoje) ano += 1;
  }

  return { ano, mes, dia };
}

// --- Datas bloqueadas (feriados, dias fechados etc.), cadastradas por conta em texto livre ---

/**
 * Confere se uma data (formato ISO "AAAA-MM-DD") está na lista de datas bloqueadas cadastrada
 * pela conta. `datasBloqueadasTexto` vem direto do campo de configuração (texto livre, dias
 * separados por vírgula, aceitando intervalo com um traço entre duas datas) — ver
 * `parseDatasBloqueadas`.
 */
function estaBloqueada(dataISO: string, datasBloqueadasTexto: string | null | undefined): boolean {
  if (!datasBloqueadasTexto?.trim()) return false;
  return parseDatasBloqueadas(datasBloqueadasTexto).has(dataISO);
}

/**
 * Interpreta o texto cadastrado em "Bloquear datas específicas": dias separados por vírgula, no
 * formato dia/mês/ano completo (ex: "25/12/2026, 31/12/2026"), aceitando também um intervalo
 * fechado usando um traço entre duas datas (ex: "24/12/2026-26/12/2026" bloqueia os 3 dias).
 * Trechos que não batem com nenhum desses formatos são ignorados, sem quebrar o resto da lista.
 */
function parseDatasBloqueadas(texto: string): Set<string> {
  const resultado = new Set<string>();
  const partes = texto.split(",").map((p) => p.trim()).filter(Boolean);

  for (const parte of partes) {
    const ladosDoIntervalo = parte.split("-").map((p) => p.trim()).filter(Boolean);

    if (ladosDoIntervalo.length === 2) {
      const inicio = parseDataBRCompleta(ladosDoIntervalo[0]);
      const fim = parseDataBRCompleta(ladosDoIntervalo[1]);
      if (inicio && fim) {
        let cursor = inicio;
        let seguranca = 0;
        while (seguranca < 366) {
          resultado.add(paraISO(cursor));
          if (paraISO(cursor) === paraISO(fim)) break;
          cursor = somarDias(cursor, 1);
          seguranca++;
        }
        continue;
      }
    }

    const unica = parseDataBRCompleta(parte);
    if (unica) resultado.add(paraISO(unica));
  }

  return resultado;
}

/** Data no formato dia/mês/ano COMPLETO (ano com 4 dígitos sempre obrigatório). */
function parseDataBRCompleta(texto: string): DataSimples | null {
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const ano = parseInt(match[3], 10);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  return { ano, mes, dia };
}

function passouDoCutoff(cutoff: string | null, horaAtual: number, minutoAtual: number): boolean {
  if (!cutoff) return false;
  const [horaCutoff, minutoCutoff] = cutoff.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(horaCutoff)) return false;
  return horaAtual > horaCutoff || (horaAtual === horaCutoff && minutoAtual >= (minutoCutoff || 0));
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
