import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { CartaoDeSecao } from "../CartaoDeSecao";
import { CLASSE_ESTADO_DESLIGADO, CLASSE_AJUDA } from "../estilosDeCampo";

export const dynamic = "force-dynamic";

const DIAS_DA_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function LinkAbrirApp() {
  const url = process.env.AGENDADOR_STORIES_APP_URL;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="self-start text-xs font-medium text-indigo-300 hover:text-indigo-200"
    >
      Abrir Agendador de Stories →
    </a>
  );
}

export default async function StoriesPage({ params }: { params: { id: string } }) {
  const admin = criarClienteAdmin();

  const [{ data: conta }, { data: config }] = await Promise.all([
    admin.from("chatbot_accounts").select("instagram_user_id").eq("id", params.id).maybeSingle(),
    admin
      .from("chatbot_account_settings")
      .select("agendador_stories_habilitado")
      .eq("account_id", params.id)
      .maybeSingle(),
  ]);

  const cabecalho = (
    <div>
      <h2 className="text-xl font-semibold text-neutral-50">Agendador de Stories</h2>
      <p className="mt-1.5 text-sm text-neutral-400">
        Publica Stories automaticamente em horários recorrentes toda semana — é um app à parte, com
        seu próprio painel. Aqui dá pra ligar/desligar e acompanhar o status; artes e horários se
        configuram lá dentro.
      </p>
    </div>
  );

  // Serviço desligado pra essa conta — mesmo espírito de Reserva/Agendamento/Busca ao Vivo: some a
  // configuração/status, só mostra o jeito de ligar de novo.
  if (!config?.agendador_stories_habilitado) {
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">Agendador de Stories está desativado pra essa conta.</p>
          <form action="/api/contas/agendador-stories-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/stories`} />
            <Interruptor ligado={false} rotulo="Ativar Agendador de Stories" />
          </form>
        </div>
      </div>
    );
  }

  const igUserId = conta?.instagram_user_id;

  // accounts/schedule_slots/publish_log são do Agendador de Stories (app separado, mas vive no
  // MESMO projeto Supabase) — casando pelo instagram_user_id, sem tabela de mapeamento própria.
  const { data: contaStories } = igUserId
    ? await admin.from("accounts").select("id, ig_username, is_active").eq("ig_user_id", igUserId).maybeSingle()
    : { data: null };

  // Conta existe aqui mas ainda não foi conectada lá — precisa passar pelo fluxo de OAuth do
  // Facebook do outro app antes de aparecer aqui (não dá pra pular isso, é exigência do Meta).
  if (!contaStories) {
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <div className={`${CLASSE_ESTADO_DESLIGADO} items-start gap-2`}>
          <p className="text-sm text-neutral-400">
            Essa conta ainda não foi conectada no Agendador de Stories. Abra o app e conecte usando
            a mesma Página do Facebook/Instagram desse cliente — depois de conectada, o status
            aparece aqui automaticamente.
          </p>
          <LinkAbrirApp />
        </div>
      </div>
    );
  }

  const [{ data: horarios }, { data: publicacoes }] = await Promise.all([
    admin.from("schedule_slots").select("day_of_week").eq("account_id", contaStories.id).eq("is_active", true),
    admin
      .from("publish_log")
      .select("status, scheduled_for, error_message")
      .eq("account_id", contaStories.id)
      .order("scheduled_for", { ascending: false })
      .limit(5),
  ]);

  const horariosPorDia = new Map<number, number>();
  for (const h of horarios ?? []) {
    horariosPorDia.set(h.day_of_week, (horariosPorDia.get(h.day_of_week) ?? 0) + 1);
  }
  const totalHorarios = horarios?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {cabecalho}
        <form action="/api/contas/agendador-stories-status" method="POST">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={`/contas/${params.id}/stories`} />
          <Interruptor
            ligado={true}
            mensagemConfirmarDesligar="Tem certeza que deseja desativar o Agendador de Stories nessa conta? Isso pausa a publicação automática de Stories lá no outro app também."
          />
        </form>
      </div>

      <p className="text-sm text-neutral-400">
        Conectada como <span className="text-neutral-200">@{contaStories.ig_username ?? "—"}</span> no
        Agendador de Stories.
      </p>

      {!contaStories.is_active && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-300">
          Está pausado diretamente no Agendador de Stories (fora daqui) — quem manda no "postar ou
          não" nesse momento é o app de lá, mesmo com o produto ligado aqui.
        </div>
      )}

      <CartaoDeSecao titulo="Horários configurados" descricao={`${totalHorarios} no total, essa semana`}>
        <div className="flex flex-wrap gap-2">
          {DIAS_DA_SEMANA.map((dia, i) => {
            const quantidade = horariosPorDia.get(i + 1) ?? 0;
            return (
              <span
                key={dia}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  quantidade > 0
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                    : "border-white/10 bg-white/[0.02] text-neutral-600"
                }`}
              >
                {dia}: {quantidade}
              </span>
            );
          })}
        </div>
      </CartaoDeSecao>

      <CartaoDeSecao titulo="Últimas publicações">
        {(publicacoes ?? []).length === 0 ? (
          <p className={CLASSE_AJUDA}>Nenhuma publicação registrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(publicacoes ?? []).map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-300">
                  {new Date(p.scheduled_for).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
                {p.status === "success" ? (
                  <span className="rounded-full border border-green-900 bg-green-950 px-2 py-0.5 text-xs text-green-300">
                    Publicado
                  </span>
                ) : (
                  <span
                    className="rounded-full border border-red-900 bg-red-950 px-2 py-0.5 text-xs text-red-300"
                    title={p.error_message ?? undefined}
                  >
                    Erro
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CartaoDeSecao>

      <LinkAbrirApp />
    </div>
  );
}
