"use client";

// Botão de Ativar/Desativar Agendamento — mesmo espírito do BotaoAtivarReservas, só que pro
// sistema de Agendamento (arquivo próprio, não reaproveitado, pra nunca arriscar mudar o
// comportamento do botão de Reservas por engano).
export function BotaoAtivarAgendamento({ habilitado }: { habilitado: boolean }) {
  return (
    <button
      type="submit"
      onClick={(evento) => {
        if (habilitado) {
          const confirmou = window.confirm(
            "Tem certeza que deseja desativar o Agendamento nessa conta? O bot para de aceitar novos agendamentos e a configuração fica escondida até você ativar de novo."
          );
          if (!confirmou) {
            evento.preventDefault();
          }
        }
      }}
      className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium ${
        habilitado
          ? "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-950"
          : "border-sky-800/60 bg-sky-950/40 text-sky-300 hover:border-sky-600"
      }`}
    >
      {habilitado ? "Desativar Agendamento" : "Ativar Agendamento"}
    </button>
  );
}
