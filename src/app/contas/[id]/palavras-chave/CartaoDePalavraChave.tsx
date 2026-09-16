"use client";

import { useState } from "react";
import { CLASSE_CAMPO, CLASSE_CAMPO_TEXTAREA, CLASSE_RÓTULO, CLASSE_AJUDA, CLASSE_BOTAO_SALVAR } from "../estilosDeCampo";

type PalavraChave = {
  id: string;
  palavra_chave: string;
  mensagens: unknown;
  pausa_entre_mensagens_ms: number | null;
};

// Dropdown fechado por padrão — com várias palavras-chave cadastradas (cada uma com até 5
// mensagens), mostrar tudo aberto de uma vez fica ilegível. Só o rótulo e o Excluir ficam
// visíveis de cara; o conteúdo (mensagens, pausa, e agora o Editar) só aparece ao abrir.
export function CartaoDePalavraChave({ contaId, pc }: { contaId: string; pc: PalavraChave }) {
  const [editando, setEditando] = useState(false);
  const mensagens = (pc.mensagens as string[]) ?? [];

  return (
    <details className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
          <span className="text-neutral-500 transition-transform group-open:rotate-90">▸</span>
          {pc.palavra_chave}
        </span>
        {/* stopPropagation — sem isso, o clique no Excluir também aciona o toggle nativo do
            <summary>, e o form ainda tenta submeter ao mesmo tempo. */}
        <form
          action={`/api/keywords/${pc.id}/excluir`}
          method="POST"
          onClick={(evento) => evento.stopPropagation()}
        >
          <button type="submit" className="shrink-0 text-xs font-medium text-red-400/80 hover:text-red-300">
            Excluir
          </button>
        </form>
      </summary>

      <div className="border-t border-white/10 px-4 py-3.5">
        {editando ? (
          <form action={`/api/keywords/${pc.id}/editar`} method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="account_id" value={contaId} />

            <div>
              <label className={CLASSE_RÓTULO}>
                Palavra-chave (pode colocar variações separadas por vírgula, ex: preço, valor, quanto
                custa)
              </label>
              <input
                type="text"
                name="palavra_chave"
                required
                defaultValue={pc.palavra_chave}
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label className={CLASSE_RÓTULO}>
                Mensagens da sequência (na ordem — deixa em branco a que não for usar)
              </label>
              <div className="mt-1.5 flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <textarea
                    key={n}
                    name={`mensagem_${n}`}
                    placeholder={`Mensagem ${n}`}
                    rows={2}
                    defaultValue={mensagens[n - 1] ?? ""}
                    className={CLASSE_CAMPO_TEXTAREA.replace("mt-1.5 ", "")}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={CLASSE_RÓTULO}>
                Pausa entre as mensagens, em milissegundos (opcional — deixa em branco pra mandar tudo
                de uma vez, sem pausa)
              </label>
              <input
                type="number"
                name="pausa_entre_mensagens_ms"
                min={0}
                placeholder="0"
                defaultValue={pc.pausa_entre_mensagens_ms || ""}
                className={CLASSE_CAMPO}
              />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className={CLASSE_BOTAO_SALVAR}>
                Salvar alterações
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            {pc.pausa_entre_mensagens_ms ? (
              <p className={CLASSE_AJUDA}>Pausa entre mensagens: {pc.pausa_entre_mensagens_ms}ms</p>
            ) : null}
            <ol className="mt-2 flex flex-col gap-1 text-xs text-neutral-400">
              {mensagens.map((m, i) => (
                <li key={i}>
                  {i + 1}. {m}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="mt-3 text-xs font-medium text-indigo-300 hover:text-indigo-200"
            >
              Editar
            </button>
          </>
        )}
      </div>
    </details>
  );
}
