"use client";

import { useState } from "react";
import type { CampoPersonalizado } from "@/lib/agendamentos";

/**
 * Construtor de perguntas extras do Agendamento — além de dia, horário, nome e WhatsApp (que são
 * fixos), o dono da conta monta aqui quantas perguntas quiser, cada uma texto livre ou múltipla
 * escolha, na ordem em que devem aparecer na conversa. Mesmo padrão do DatasBloqueadasEditor: um
 * campo escondido carrega tudo serializado (aqui, JSON) pro backend salvar de uma vez só.
 */
export default function CamposPersonalizadosEditor({
  nome,
  valorInicial,
}: {
  nome: string;
  valorInicial: CampoPersonalizado[];
}) {
  const [campos, setCampos] = useState<CampoPersonalizado[]>(valorInicial);

  function adicionarCampo() {
    setCampos((atual) => [
      ...atual,
      { id: `campo_${Date.now()}_${Math.floor(Math.random() * 1000)}`, pergunta: "", tipo: "texto" },
    ]);
  }

  function removerCampo(id: string) {
    setCampos((atual) => atual.filter((c) => c.id !== id));
  }

  function moverCampo(id: string, direcao: -1 | 1) {
    setCampos((atual) => {
      const i = atual.findIndex((c) => c.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function atualizarCampo(id: string, mudancas: Partial<CampoPersonalizado>) {
    setCampos((atual) => atual.map((c) => (c.id === id ? { ...c, ...mudancas } : c)));
  }

  function atualizarOpcoesTexto(id: string, texto: string) {
    const opcoes = texto
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    atualizarCampo(id, { opcoes });
  }

  return (
    <div>
      <input type="hidden" name={nome} value={JSON.stringify(campos)} />

      {campos.length === 0 && (
        <p className="text-xs text-neutral-500">
          Nenhuma pergunta extra ainda — o bot só vai perguntar dia, horário, nome e WhatsApp.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {campos.map((campo, i) => (
          <div key={campo.id} className="rounded-lg border border-neutral-700 bg-neutral-950 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-xs font-medium text-neutral-500">{i + 1}.</span>
              <div className="flex-1">
                <input
                  type="text"
                  value={campo.pergunta}
                  onChange={(e) => atualizarCampo(campo.id, { pergunta: e.target.value })}
                  placeholder="Ex: Qual serviço você deseja?"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <input
                      type="radio"
                      name={`tipo-${campo.id}`}
                      checked={campo.tipo === "texto"}
                      onChange={() => atualizarCampo(campo.id, { tipo: "texto" })}
                    />
                    Resposta livre
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <input
                      type="radio"
                      name={`tipo-${campo.id}`}
                      checked={campo.tipo === "opcoes"}
                      onChange={() => atualizarCampo(campo.id, { tipo: "opcoes" })}
                    />
                    Múltipla escolha
                  </label>
                </div>

                {campo.tipo === "opcoes" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={(campo.opcoes ?? []).join(", ")}
                      onChange={(e) => atualizarOpcoesTexto(campo.id, e.target.value)}
                      placeholder="Manicure, Pedicure, Escova"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-neutral-500">Opções separadas por vírgula.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moverCampo(campo.id, -1)}
                  disabled={i === 0}
                  aria-label="Mover pra cima"
                  className="rounded border border-neutral-700 px-1.5 text-xs text-neutral-400 hover:border-neutral-500 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moverCampo(campo.id, 1)}
                  disabled={i === campos.length - 1}
                  aria-label="Mover pra baixo"
                  className="rounded border border-neutral-700 px-1.5 text-xs text-neutral-400 hover:border-neutral-500 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removerCampo(campo.id)}
                  aria-label="Remover pergunta"
                  className="rounded border border-neutral-700 px-1.5 text-xs text-red-400 hover:border-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={adicionarCampo}
        className="mt-3 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500"
      >
        + Adicionar pergunta
      </button>
    </div>
  );
}
