"use client";

import { usePathname } from "next/navigation";

const ABAS_POR_SERVICO = [
  { segmento: "palavras-chave", rotulo: "Palavras-chave", chave: "directHabilitado" as const },
  { segmento: "gemini", rotulo: "Gemini", chave: "directHabilitado" as const },
  { segmento: "reserva", rotulo: "Reserva", chave: "reservaHabilitada" as const },
  { segmento: "agendamento", rotulo: "Agendamento", chave: "agendamentoHabilitado" as const },
  { segmento: "busca", rotulo: "Busca Automática", chave: "buscaHabilitada" as const },
];

const ABAS_FINAIS = [
  { segmento: "atendimentos", rotulo: "Atendimentos" },
  { segmento: "ignorados", rotulo: "Ignorados" },
  { segmento: "funcionarios", rotulo: "Funcionários" },
];

/**
 * Menu de abas de cada conta, agora ESCONDENDO a aba de um serviço (Direct/Reserva/Agendamento/
 * Busca Automática) quando ele está desligado naquela conta — antes as abas apareciam sempre,
 * pra toda conta, mesmo numa que nunca vai usar reserva nem agendamento (ex: uma conta só de
 * atendimento automático) — isso é exatamente o "muito rolo" que o Victor reportou. Palavras-
 * chave/Gemini entraram no mesmo grupo condicional (chave "directHabilitado"): existe conta que
 * contrata só Reserva sem contratar o Chatbot Direct, então nem essas duas fazem sentido pra ela.
 * As chavinhas de verdade (ligar/desligar) ficam nos cartões de /contas (ver ChavesDeServico.tsx)
 * — aqui só decide o que mostrar, não liga nem desliga nada.
 */
export default function AbasDaConta({
  contaId,
  directHabilitado,
  reservaHabilitada,
  agendamentoHabilitado,
  buscaHabilitada,
}: {
  contaId: string;
  directHabilitado: boolean;
  reservaHabilitada: boolean;
  agendamentoHabilitado: boolean;
  buscaHabilitada: boolean;
}) {
  const pathname = usePathname();
  const flags = { directHabilitado, reservaHabilitada, agendamentoHabilitado, buscaHabilitada };

  const abas = [...ABAS_POR_SERVICO.filter((aba) => flags[aba.chave]), ...ABAS_FINAIS];

  return (
    // Sem backdrop-filter aqui de propósito — essa barra já vive DENTRO do shell da conta (ver
    // [id]/layout.tsx), que já tem seu próprio backdrop-filter. Empilhar blur dentro de blur foi
    // exatamente o que deu artefato visual conhecido no Safari/WebKit quando tentamos isso com os
    // cartões de reserva dentro do painel do dia — aqui só um fundo sólido, sem filtro próprio.
    <nav className="mt-6 flex flex-wrap gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2">
      {abas.map((aba) => {
        const href = `/contas/${contaId}/${aba.segmento}`;
        const ativa = pathname?.startsWith(href) ?? false;

        return (
          <a
            key={aba.segmento}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              ativa
                ? "bg-indigo-500 font-medium text-white shadow-md shadow-indigo-950/40"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {aba.rotulo}
          </a>
        );
      })}
    </nav>
  );
}
