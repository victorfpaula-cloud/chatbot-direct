import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  agoraEmSaoPaulo,
  buscarConfig,
  paraISO,
  parseDatasBloqueadas,
  passouDoCutoff,
} from "@/lib/reservas";
import { paletaAPartirDoHex, paletaAPartirDeAcentoExato, type PaletaDoLogo } from "@/lib/paletaDoLogo";

// Reserva externa (link público /r/[slug], fora do Instagram — ver src/app/r/[slug]/page.tsx e as
// rotas em src/app/api/r/[slug]/). Todo o cálculo de "o que pode ser reservado agora" mora aqui,
// em cima das MESMAS colunas de chatbot_account_settings que o fluxo do Instagram usa (ver
// src/lib/reservas.ts) — não existe cópia nem cache: cada requisição lê a config ao vivo, então uma
// mudança feita no painel (Instagram) vale automaticamente pro link também.

type Admin = ReturnType<typeof criarClienteAdmin>;

export type ContaExterna = {
  id: string;
  page_name: string;
  foto_perfil_url: string | null;
  cor_predominante_logo: string | null;
  cor_destaque_manual: string | null;
};

export async function buscarContaPorSlug(admin: Admin, slug: string): Promise<ContaExterna | null> {
  const { data, error } = await admin
    .from("chatbot_accounts")
    .select("id, page_name, active, foto_perfil_url, cor_predominante_logo, cor_destaque_manual")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.active) return null;
  return {
    id: data.id,
    page_name: data.page_name,
    foto_perfil_url: data.foto_perfil_url,
    cor_predominante_logo: data.cor_predominante_logo,
    cor_destaque_manual: data.cor_destaque_manual,
  };
}

export type ConfigPublica = {
  nomeConta: string;
  logoUrl: string | null;
  paleta: PaletaDoLogo | null;
  aceitaReservas: boolean;
  mensagemFechado: string | null;
  hojeFechadoPorHorario: boolean;
  datasBloqueadas: string[];
  regrasTexto: string | null;
  mensagemConfirmada: string;
};

/** Só os campos que a página pública precisa pra desenhar a experiência — nunca token/id interno. */
export async function montarConfigPublica(admin: Admin, conta: ContaExterna): Promise<ConfigPublica> {
  const { data: config } = await buscarConfig(admin, conta.id);
  const agora = agoraEmSaoPaulo();

  const hojeFechadoPorHorario = passouDoCutoff(config?.reserva_cutoff_horario ?? null, agora.hora, agora.minuto);
  const datasBloqueadas = config?.reserva_datas_bloqueadas
    ? Array.from(parseDatasBloqueadas(config.reserva_datas_bloqueadas))
    : [];

  const reservaDesligada = config ? !config.reserva_habilitada : false;
  const emPausa = !!config?.reserva_pausa_ativa;

  return {
    nomeConta: conta.page_name,
    logoUrl: conta.foto_perfil_url,
    // Cor escolhida à mão (se houver) sempre vence a extraída automaticamente do logo — ver
    // paletaAPartirDeAcentoExato em src/lib/corDoLogo.ts.
    paleta: conta.cor_destaque_manual
      ? paletaAPartirDeAcentoExato(conta.cor_destaque_manual)
      : conta.cor_predominante_logo
        ? paletaAPartirDoHex(conta.cor_predominante_logo)
        : null,
    aceitaReservas: !reservaDesligada && !emPausa,
    mensagemFechado: emPausa
      ? config?.reserva_pausa_mensagem?.trim() ||
        "No momento não estamos aceitando novas reservas por aqui. Assim que reabrirmos, avisamos por aqui."
      : reservaDesligada
        ? "Reservas online estão temporariamente indisponíveis."
        : null,
    hojeFechadoPorHorario,
    datasBloqueadas,
    regrasTexto: config?.reserva_regras_texto?.trim() || null,
    mensagemConfirmada:
      config?.reserva_msg_confirmada?.trim() ||
      "Reserva confirmada! Te esperamos por lá. Qualquer mudança, é só chamar por aqui de novo.",
  };
}

/** Data de hoje em SP no formato ISO (AAAA-MM-DD) — usado pra validar que a data pedida não é passado. */
export function hojeISO(): string {
  return paraISO(agoraEmSaoPaulo());
}

/**
 * Só pra página pública (src/app/r/[slug]/page.tsx) distinguir "esse link nunca existiu" (404 de
 * verdade) de "esse link existe, mas a conta tá pausada" (Victor pausa quando o cliente não paga —
 * ver botão Pausar em /contas) — as duas caem em `buscarContaPorSlug` devolvendo null, de propósito
 * (as rotas de API de reserva, que É onde importa de verdade bloquear, não precisam nem devem saber
 * o motivo, só que não pode reservar). Chamada só quando `buscarContaPorSlug` já devolveu null.
 */
export async function slugPertenceAContaPausada(admin: Admin, slug: string): Promise<boolean> {
  const { data } = await admin.from("chatbot_accounts").select("active").eq("slug", slug).maybeSingle();
  return !!data && !data.active;
}
