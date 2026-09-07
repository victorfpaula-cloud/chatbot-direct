"use client";

// Botão de Ativar/Desativar reservas — mesmo espírito do BotaoPausar (confirmação só no sentido
// "perigoso": desativar corta o fluxo de reserva na hora, então avisa antes; ativar não tem risco
// nenhum, não precisa confirmar).
export function BotaoAtivarReservas({ habilitada }: { habilitada: boolean }) {
  return (
    <button
      type="submit"
      onClick={(evento) => {
        if (habilitada) {
          const confirmou = window.confirm(
            "Tem certeza que deseja desativar reservas nessa conta? O bot para de aceitar novas reservas, a configuração fica escondida e ela some do dropdown de reservas até você ativar de novo."
          );
          if (!confirmou) {
            evento.preventDefault();
          }
        }
      }}
      className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium ${
        habilitada
          ? "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-950"
          : "border-sky-800/60 bg-sky-950/40 text-sky-300 hover:border-sky-600"
      }`}
    >
      {habilitada ? "Desativar reservas" : "Ativar reservas"}
    </button>
  );
}
