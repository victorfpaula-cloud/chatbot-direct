import { criarClienteAdmin } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof criarClienteAdmin>;

const JANELA_DE_ESPERA_MS = 2500;

/**
 * Agrupa mensagens mandadas em sequência rápida pela mesma pessoa (ex.: manda uma mensagem e,
 * meio segundo depois, manda outra completando o pensamento) numa resposta só, em vez de
 * responder cada uma separadamente — reportado em teste real: um cliente mandou duas mensagens
 * seguidas ("Talvez ao invés de 8 pessoas, serão 9" / "Tem problema?") e o bot respondeu as duas,
 * cada uma com um texto genérico diferente, como se fossem perguntas sem relação nenhuma.
 *
 * Chamada só no caminho de palavra-chave/Gemini (ver decidirEResponder em respostaAutomatica.ts)
 * — nunca no meio do fluxo de reserva, que precisa continuar respondendo cada etapa na hora, sem
 * atraso nenhum (é exatamente o oposto do que a reserva já teve que ficar confiável pra fazer).
 *
 * Funciona colocando a mensagem numa fila compartilhada (`chatbot_mensagens_pendentes`) e
 * esperando um pouco: se aparecer uma mensagem MAIS NOVA da mesma pessoa nesse meio tempo, essa
 * chamada desiste (devolve null, sem responder nada) — quem responde por todo mundo é a chamada
 * da mensagem mais recente, que junta tudo que ainda estiver na fila (da mais antiga pra mais
 * nova) numa resposta só. Como cada mensagem chega numa invocação separada (função serverless),
 * a coordenação precisa ser via banco, não em memória.
 */
export async function agruparMensagensRapidas(
  admin: Admin,
  accountId: string,
  idDoCliente: string,
  texto: string
): Promise<string | null> {
  const { data: minha, error: erroAoInserir } = await admin
    .from("chatbot_mensagens_pendentes")
    .insert({ account_id: accountId, instagram_scoped_id: idDoCliente, texto })
    .select("id, criado_em")
    .single();

  if (erroAoInserir || !minha) {
    // Não trava o atendimento por causa disso — se a fila de agrupamento falhar, segue com o
    // texto original, sem agrupar nada.
    console.error("Falha ao inserir na fila de agrupamento de mensagens:", erroAoInserir);
    return texto;
  }

  await aguardar(JANELA_DE_ESPERA_MS);

  const { data: maisRecente } = await admin
    .from("chatbot_mensagens_pendentes")
    .select("id")
    .eq("account_id", accountId)
    .eq("instagram_scoped_id", idDoCliente)
    .gt("criado_em", minha.criado_em)
    .limit(1)
    .maybeSingle();

  if (maisRecente) {
    // Já existe mensagem mais nova na fila pra essa mesma pessoa — quem vai responder é aquela
    // chamada (que vai pegar a minha também na hora de juntar tudo); essa aqui não faz nada.
    return null;
  }

  const { data: pendentes } = await admin
    .from("chatbot_mensagens_pendentes")
    .select("id, texto")
    .eq("account_id", accountId)
    .eq("instagram_scoped_id", idDoCliente)
    .order("criado_em", { ascending: true });

  const ids = (pendentes ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await admin.from("chatbot_mensagens_pendentes").delete().in("id", ids);
  }

  return (pendentes ?? []).map((p) => p.texto).join("\n");
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
