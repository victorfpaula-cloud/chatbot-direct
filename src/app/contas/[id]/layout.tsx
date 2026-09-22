import type { ReactNode } from "react";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import AbasDaConta from "./AbasDaConta";

export const dynamic = "force-dynamic";

export default async function ContaLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const admin = criarClienteAdmin();
  const [{ data: conta }, { data: config }] = await Promise.all([
    admin.from("chatbot_accounts").select("id, page_name, instagram_username").eq("id", params.id).maybeSingle(),
    admin
      .from("chatbot_account_settings")
      .select("chatbot_direct_habilitado, reserva_habilitada, agendamento_habilitado, busca_automatica_habilitada")
      .eq("account_id", params.id)
      .maybeSingle(),
  ]);

  return (
    // Mesma escala responsiva de max-w/padding já usada em /contas (ver comentário lá) — reportado
    // aqui pelo mesmo motivo: com max-w-3xl fixo sobrava borda vazia dos lados em telas maiores E a
    // barra de abas (AbasDaConta) quebrava em duas linhas à toa (ex: "Funcionários" sozinho embaixo)
    // quando dava pra caber tudo numa linha só com mais espaço disponível.
    <main className="mx-auto max-w-3xl px-6 py-10 md:max-w-4xl md:px-10 lg:max-w-5xl lg:px-12">
      <a href="/contas" className="text-sm text-neutral-400 hover:text-neutral-300">
        &larr; Voltar pras contas
      </a>

      {conta ? (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_-20px_rgba(0,0,0,0.6)] [backdrop-filter:blur(24px)_url(#vidro-shell-contas)] [-webkit-backdrop-filter:blur(24px)_url(#vidro-shell-contas)]">
            <h1 className="text-xl font-semibold text-neutral-50">{conta.page_name}</h1>
            <p className="mt-1 text-sm text-neutral-400">@{conta.instagram_username}</p>

            <AbasDaConta
              contaId={conta.id}
              directHabilitado={config?.chatbot_direct_habilitado ?? true}
              reservaHabilitada={config?.reserva_habilitada ?? false}
              agendamentoHabilitado={config?.agendamento_habilitado ?? false}
              buscaHabilitada={config?.busca_automatica_habilitada ?? false}
            />

            <div className="mt-6">{children}</div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-neutral-400">Conta não encontrada.</p>
      )}
    </main>
  );
}
