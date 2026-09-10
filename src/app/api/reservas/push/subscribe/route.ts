import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";

/**
 * Guarda a inscrição de push de quem tocou em "Ativar notificações" na tela de reservas — chamada
 * pelo componente NotificacoesPush.tsx logo depois do navegador confirmar a inscrição. Um endpoint
 * só existe uma vez (upsert por `endpoint`, que é único por instalação do navegador), então tocar
 * em "ativar" de novo no mesmo aparelho só atualiza a linha em vez de duplicar.
 */
export async function POST(request: NextRequest) {
  const admin = criarClienteAdmin();
  const autorInfo = await resolverAutorDaAcao(request, admin);
  if (!autorInfo) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const inscricao = corpo?.subscription;
  if (!inscricao?.endpoint || !inscricao?.keys?.p256dh || !inscricao?.keys?.auth) {
    return NextResponse.json({ erro: "inscrição de push inválida" }, { status: 400 });
  }

  // Funcionário só pode se inscrever na própria conta — nunca confia no conta_id que o navegador
  // mandar pra esse caso. O Victor (admin) enxerga várias contas, então pra ele o conta_id vem do
  // corpo mesmo (a tela já sabe qual conta está selecionada).
  const contaId = autorInfo.tipo === "funcionario" ? autorInfo.contaId : corpo?.conta_id?.toString();
  if (!contaId) {
    return NextResponse.json({ erro: "conta não informada" }, { status: 400 });
  }

  const { error } = await admin.from("chatbot_push_subscriptions").upsert(
    {
      account_id: contaId,
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Falha ao salvar inscrição de push:", error);
    return NextResponse.json({ erro: "falha ao salvar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
