"use client";

import { useState, type ReactNode } from "react";
import { agruparPorCliente, CartaoDeAtendimento, type Atendimento } from "./atendimentosCompartilhado";

type Estado = "fechado" | "carregando" | "carregado" | "erro";

/**
 * Um dia inteiro de atendimentos: o cabeçalho (contagem, quantos com erro) já vem pronto do
 * servidor, mas a lista de atendimentos em si (com mensagem/resposta/erro completos) só é buscada
 * em `/api/atendimentos/dia` na hora em que a pessoa abre esse dropdown — evita carregar o
 * histórico inteiro da conta de uma vez só toda vez que a tela abre (mesmo espírito de
 * DiaComCarregamentoSobDemanda.tsx, em src/app/reservas/).
 */
export function DiaDeAtendimentosSobDemanda({
  cabecalho,
  contaId,
  data,
  status,
}: {
  cabecalho: ReactNode;
  contaId: string;
  data: string;
  status: string | undefined;
}) {
  const [estado, setEstado] = useState<Estado>("fechado");
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);

  async function carregar() {
    setEstado("carregando");
    try {
      const params = new URLSearchParams({ conta: contaId, data });
      if (status) params.set("status", status);

      const resposta = await fetch(`/api/atendimentos/dia?${params.toString()}`);
      if (!resposta.ok) {
        const corpoDoErro = await resposta.text().catch(() => "");
        console.error(`/api/atendimentos/dia falhou (${resposta.status}): ${corpoDoErro}`);
        throw new Error("falha na requisição");
      }
      const corpo = await resposta.json();
      setAtendimentos((corpo.atendimentos ?? []) as Atendimento[]);
      setEstado("carregado");
    } catch (erro) {
      console.error("Falha ao carregar atendimentos do dia", erro);
      setEstado("erro");
    }
  }

  const grupos = agruparPorCliente(atendimentos);

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] open:border-indigo-500/30 [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]"
      onToggle={(evento) => {
        const abriu = (evento.target as HTMLDetailsElement).open;
        // "erro" também dispara uma nova tentativa — sem isso, fechar e reabrir o dropdown depois
        // de uma falha nunca tentava de novo (o estado ficava travado em "erro" pra sempre).
        if (abriu && (estado === "fechado" || estado === "erro")) carregar();
      }}
    >
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{cabecalho}</summary>

      {estado === "carregando" && (
        <p className="border-t border-white/10 px-4 py-6 text-center text-sm text-neutral-500">
          Carregando atendimentos...
        </p>
      )}
      {estado === "erro" && (
        <div className="flex flex-col items-center gap-3 border-t border-white/10 px-4 py-6 text-center text-sm text-red-400">
          <p>Não foi possível carregar os atendimentos desse dia.</p>
          <button
            type="button"
            onClick={carregar}
            className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:border-red-600"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {estado === "carregado" && (
        <div className="flex flex-col gap-3 border-t border-white/10 p-4 pt-3">
          {grupos.map((grupo) => (
            <details
              key={grupo.instagramScopedId}
              className="group/cliente rounded-xl border border-white/10 bg-black/20 open:border-white/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 transition-transform group-open/cliente:rotate-90">▸</span>
                  <span className="break-words font-medium text-neutral-200">
                    {grupo.clienteNome ?? "Cliente"}
                    {grupo.clienteUsername ? (
                      <span className="text-neutral-500"> · @{grupo.clienteUsername}</span>
                    ) : null}
                  </span>
                  {grupo.temErro && (
                    <span className="rounded-full border border-red-900 bg-red-950 px-2 py-0.5 text-xs text-red-300">
                      Erro
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-neutral-500">
                  {grupo.atendimentos.length} {grupo.atendimentos.length === 1 ? "atendimento" : "atendimentos"}
                </span>
              </summary>

              <div className="flex flex-col gap-3 border-t border-white/10 p-4 pt-3">
                {grupo.atendimentos.map((atendimento) => (
                  <CartaoDeAtendimento key={atendimento.id} atendimento={atendimento} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </details>
  );
}
