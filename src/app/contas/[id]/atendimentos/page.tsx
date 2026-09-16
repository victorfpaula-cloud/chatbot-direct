import { criarClienteAdmin } from "@/lib/supabase/admin";
import { dataEmSaoPauloISO } from "@/lib/datas";
import { DiaDeAtendimentosSobDemanda } from "./DiaDeAtendimentosSobDemanda";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function primeiraLetraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Mesmo formato "Terça, 15 de setembro" já usado em /reservas (formatarDataExtensa, em
// PainelDeReservas.tsx) — meio-dia UTC ao montar a Date evita virar o dia errado perto da
// virada, já que dataISO aqui é um dia CIVIL de São Paulo, não um instante UTC.
function formatarCabecalhoDoDia(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(ano, mes - 1, dia, 12)));
  return primeiraLetraMaiuscula(formatado);
}

export default async function AtendimentosPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string };
}) {
  const admin = criarClienteAdmin();
  const filtroDeStatus = searchParams.status;

  // Consulta leve: só criado_em + status, pra montar o cabeçalho de cada dia (contagem, quantos
  // com erro) sem baixar mensagem/resposta/erro_detalhe de cada atendimento — o detalhe de um dia
  // só é buscado (via /api/atendimentos/dia) quando a pessoa abre o dropdown daquele dia, ver
  // DiaDeAtendimentosSobDemanda.tsx.
  let consultaLeve = admin
    .from("chatbot_atendimentos")
    .select("criado_em, status")
    .eq("account_id", params.id);

  if (filtroDeStatus === "respondido" || filtroDeStatus === "erro" || filtroDeStatus === "sem_resposta") {
    consultaLeve = consultaLeve.eq("status", filtroDeStatus);
  }

  const { data: leve } = await consultaLeve;

  const porDia = new Map<string, { total: number; erros: number }>();
  for (const linha of leve ?? []) {
    const dia = dataEmSaoPauloISO(linha.criado_em);
    const atual = porDia.get(dia) ?? { total: 0, erros: 0 };
    atual.total += 1;
    if (linha.status === "erro") atual.erros += 1;
    porDia.set(dia, atual);
  }

  const diasOrdenados = Array.from(porDia.keys()).sort().reverse();

  const filtros: { valor: string | undefined; rotulo: string }[] = [
    { valor: undefined, rotulo: "Todos" },
    { valor: "respondido", rotulo: "Respondido" },
    { valor: "erro", rotulo: "Erro" },
    { valor: "sem_resposta", rotulo: "Sem resposta" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-neutral-50">Atendimentos</h2>
      <p className="mt-1.5 text-sm text-neutral-400">
        Histórico de mensagens recebidas nessa conta, agrupado por dia — abre um dia pra carregar
        os atendimentos daquele dia (agrupados por cliente), sem baixar o histórico inteiro de
        cara. Cada atendimento mostra o que o bot fez em resposta — se respondeu, se deu erro, ou
        se ficou em silêncio (nenhuma palavra-chave bateu e o Gemini não está configurado).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filtros.map((filtro) => {
          const ativo = filtro.valor === filtroDeStatus || (!filtro.valor && !filtroDeStatus);
          const href = filtro.valor
            ? `/contas/${params.id}/atendimentos?status=${filtro.valor}`
            : `/contas/${params.id}/atendimentos`;

          return (
            <a
              key={filtro.rotulo}
              href={href}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                ativo
                  ? "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-950/40"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              {filtro.rotulo}
            </a>
          );
        })}
      </div>

      {diasOrdenados.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">Nenhum atendimento registrado ainda.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {diasOrdenados.map((dia) => {
            const resumo = porDia.get(dia)!;
            return (
              <DiaDeAtendimentosSobDemanda
                key={dia}
                contaId={params.id}
                data={dia}
                status={filtroDeStatus}
                cabecalho={
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-neutral-500"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {formatarCabecalhoDoDia(dia)}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-neutral-500">
                      {resumo.total} {resumo.total === 1 ? "atendimento" : "atendimentos"}
                      {filtroDeStatus !== "erro" && resumo.erros > 0 && (
                        <span className="rounded-full border border-red-900 bg-red-950 px-2 py-0.5 font-medium text-red-300">
                          {resumo.erros} {resumo.erros === 1 ? "erro" : "erros"}
                        </span>
                      )}
                    </span>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
