import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { CartaoDeSecao } from "../CartaoDeSecao";
import {
  CLASSE_CAMPO,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function BuscaConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();
  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select("busca_automatica_habilitada, busca_automatica_url")
    .eq("account_id", params.id)
    .maybeSingle();

  if (!config?.busca_automatica_habilitada) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Busca ao Vivo</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Consulta periódica a um site externo (ex: programação de um cinema) pra responder o
            cliente com informação sempre atualizada, sem precisar navegar no site a cada pergunta.
          </p>
        </div>

        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">
            Busca ao Vivo está desativada pra essa conta — a configuração fica escondida até
            você ativar.
          </p>
          <form action="/api/contas/busca-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/busca`} />
            <Interruptor ligado={false} rotulo="Ativar Busca ao Vivo" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Busca ao Vivo</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Consulta periódica a um site externo (ex: programação de um cinema) pra responder o
            cliente com informação sempre atualizada, sem precisar navegar no site a cada pergunta.
          </p>
        </div>
        <form action="/api/contas/busca-status" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={`/contas/${params.id}/busca`} />
          <Interruptor
            ligado={true}
            rotulo="Busca ativa"
            mensagemConfirmarDesligar="Tem certeza que deseja desativar a Busca ao Vivo nessa conta? A configuração fica escondida até você ativar de novo."
          />
        </form>
      </div>

      {searchParams.salvo && <div className={CLASSE_AVISO_SALVO}>Configuração salva.</div>}
      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <form action="/api/busca-config" method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <CartaoDeSecao
          titulo="Site a consultar"
          descricao="Link da página onde essa informação aparece (ex: a programação do dia no site do cinema). A busca em si é preparada em uma etapa futura — por enquanto isso só guarda o link."
        >
          <div>
            <label className={CLASSE_RÓTULO}>URL do site</label>
            <input
              type="url"
              name="busca_automatica_url"
              defaultValue={config?.busca_automatica_url ?? ""}
              placeholder="https://exemplo.com.br/programacao"
              className={CLASSE_CAMPO}
            />
            <p className={CLASSE_AJUDA}>Cole o endereço completo, com https://.</p>
          </div>
        </CartaoDeSecao>

        <button type="submit" className={CLASSE_BOTAO_SALVAR}>
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
