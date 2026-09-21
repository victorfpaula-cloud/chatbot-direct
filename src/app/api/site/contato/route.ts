import { NextRequest, NextResponse } from "next/server";
import { enviarEmailDeContatoDoSite } from "@/lib/email";

/**
 * Formulário de contato do final da home de vendas (/site) — sem sessão nenhuma (ver exceção
 * `api/site/` em src/middleware.ts), igual à reserva externa. Sem tabela no banco: é só lead
 * comercial, vai direto por e-mail (enviarEmailDeContatoDoSite).
 */
export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null);

  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const whatsapp = typeof corpo?.whatsapp === "string" ? corpo.whatsapp.trim() : "";
  const restaurante = typeof corpo?.restaurante === "string" ? corpo.restaurante.trim() : "";
  const mensagem = typeof corpo?.mensagem === "string" ? corpo.mensagem.trim() : "";

  if (!nome || nome.length < 2 || whatsapp.replace(/\D/g, "").length < 8 || !restaurante) {
    return NextResponse.json(
      { ok: false, mensagem: "Confere o nome, o WhatsApp e o restaurante." },
      { status: 400 }
    );
  }

  const resultado = await enviarEmailDeContatoDoSite({ nome, whatsapp, restaurante, mensagem });

  if (!resultado.sucesso) {
    return NextResponse.json(
      { ok: false, mensagem: "Não deu pra enviar agora. Tenta de novo ou chama no WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, mensagem: "Recebido! Volta pra você em breve." });
}
