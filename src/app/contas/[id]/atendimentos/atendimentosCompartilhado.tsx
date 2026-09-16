// Compartilhado entre a página (que só monta os cabeçalhos de cada dia) e
// DiaComCarregamentoSobDemanda.tsx (que busca e renderiza o detalhe de um dia só, sob demanda) —
// mesmo espírito de reservasCompartilhado.tsx.

export const RESPOSTA_POR_TIPO: Record<string, string> = {
  reserva: "Fluxo de reserva",
  palavra_chave: "Palavra-chave",
  gemini: "Gemini (IA)",
  sem_resposta: "Sem resposta",
};

export type Atendimento = {
  id: string;
  instagram_scoped_id: string;
  cliente_nome: string | null;
  cliente_username: string | null;
  mensagem_recebida: string | null;
  tipo_resposta: string;
  resposta_enviada: string | null;
  status: string;
  erro_detalhe: string | null;
  criado_em: string;
};

export type GrupoPorCliente = {
  instagramScopedId: string;
  clienteNome: string | null;
  clienteUsername: string | null;
  atendimentos: Atendimento[];
  temErro: boolean;
};

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BadgeDeStatus({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    respondido: "border-green-900 bg-green-950 text-green-300",
    erro: "border-red-900 bg-red-950 text-red-300",
    sem_resposta: "border-neutral-700 bg-neutral-900 text-neutral-400",
  };

  const rotulos: Record<string, string> = {
    respondido: "Respondido",
    erro: "Erro",
    sem_resposta: "Sem resposta",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${estilos[status] ?? estilos.sem_resposta}`}>
      {rotulos[status] ?? status}
    </span>
  );
}

/**
 * Agrupa os atendimentos por cliente (pelo IGSID, o id do cliente no Direct — mais confiável que
 * nome/@usuário, que podem mudar). Como a lista já vem ordenada mais recente primeiro, o primeiro
 * atendimento de cada cliente que aparece durante a montagem dos grupos já é o mais recente DELE,
 * e os grupos acabam naturalmente na ordem "cliente mais ativo recentemente primeiro" — sem
 * precisar ordenar de novo depois.
 */
export function agruparPorCliente(atendimentos: Atendimento[]): GrupoPorCliente[] {
  const grupos = new Map<string, GrupoPorCliente>();

  for (const atendimento of atendimentos) {
    const chave = atendimento.instagram_scoped_id;
    let grupo = grupos.get(chave);

    if (!grupo) {
      grupo = {
        instagramScopedId: chave,
        clienteNome: atendimento.cliente_nome,
        clienteUsername: atendimento.cliente_username,
        atendimentos: [],
        temErro: false,
      };
      grupos.set(chave, grupo);
    }

    grupo.atendimentos.push(atendimento);
    if (atendimento.status === "erro") grupo.temErro = true;
  }

  return Array.from(grupos.values());
}

export function CartaoDeAtendimento({ atendimento }: { atendimento: Atendimento }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-neutral-500">{formatarDataHora(atendimento.criado_em)}</span>
        <BadgeDeStatus status={atendimento.status} />
      </div>

      <p className="mt-2 break-words text-neutral-400">
        <span className="text-neutral-500">Mensagem recebida: </span>
        {atendimento.mensagem_recebida ?? "—"}
      </p>

      <p className="mt-1 break-words text-neutral-400">
        <span className="text-neutral-500">Tipo de resposta: </span>
        {RESPOSTA_POR_TIPO[atendimento.tipo_resposta] ?? atendimento.tipo_resposta}
      </p>

      {atendimento.status === "respondido" && (
        <p className="mt-1 break-words text-neutral-400">
          <span className="text-neutral-500">Resposta enviada: </span>
          {atendimento.resposta_enviada || (
            // Atendimento de antes da migração pra API oficial (26/08–12/09/2026): quem mandava a
            // mensagem de verdade era a própria SendPulse, e o texto exato só era salvo aqui se o
            // envio por ela falhasse — no caminho normal (sucesso), esse texto nunca chegou a ser
            // guardado. Só afeta atendimento antigo; todo atendimento novo já grava o texto certo.
            <span className="italic text-neutral-600">
              — texto não registrado (atendimento de antes da migração pra API oficial)
            </span>
          )}
        </p>
      )}

      {atendimento.status === "erro" && atendimento.erro_detalhe && (
        <p className="mt-2 break-words rounded-lg border border-red-800/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {atendimento.erro_detalhe}
        </p>
      )}
    </div>
  );
}
