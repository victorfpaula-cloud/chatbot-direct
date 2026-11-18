import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { CartaoDeSecao } from "../CartaoDeSecao";
import WhatsAppsAdminLeadsEditor from "./WhatsAppsAdminLeadsEditor";
import {
  CLASSE_CAMPO,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
  CLASSE_CHECKBOX,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const PERGUNTAS_DISPONIVEIS: { id: string; rotulo: string; pergunta: string }[] = [
  { id: "interesse", rotulo: "Interesse (comprar/alugar/vender)", pergunta: "Você quer comprar, alugar ou vender um imóvel?" },
  { id: "tipo", rotulo: "Tipo de imóvel", pergunta: "Que tipo de imóvel você procura?" },
  { id: "regiao", rotulo: "Região/bairro", pergunta: "Em qual bairro ou região você tem interesse?" },
  { id: "preco", rotulo: "Faixa de preço", pergunta: "Até quanto você pretende investir?" },
  { id: "quartos", rotulo: "Quartos", pergunta: "Quantos quartos você precisa?" },
];

export default async function LeadsConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();
  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select("leads_habilitado, palavra_chave_lead, leads_perguntas_ativas, leads_admin_whatsapp")
    .eq("account_id", params.id)
    .maybeSingle();

  if (!config?.leads_habilitado) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Leads</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Qualifica quem manda mensagem interessado em um imóvel (pergunta por pergunta) e já
            manda um resumo limpo pro WhatsApp do responsável.
          </p>
        </div>

        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">
            Leads está desativado pra essa conta — a configuração fica escondida até você ativar.
          </p>
          <form action="/api/contas/leads-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/leads`} />
            <Interruptor ligado={false} rotulo="Ativar Leads" />
          </form>
        </div>
      </div>
    );
  }

  const perguntasAtivas: string[] = Array.isArray(config.leads_perguntas_ativas)
    ? (config.leads_perguntas_ativas as string[])
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Leads</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Qualifica quem manda mensagem interessado em um imóvel (pergunta por pergunta) e já
            manda um resumo limpo pro WhatsApp do responsável.
          </p>
        </div>
        <form action="/api/contas/leads-status" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={`/contas/${params.id}/leads`} />
          <Interruptor
            ligado={true}
            rotulo="Leads ativo"
            mensagemConfirmarDesligar="Tem certeza que deseja desativar Leads nessa conta? A configuração fica escondida até você ativar de novo."
          />
        </form>
      </div>

      {searchParams.salvo && <div className={CLASSE_AVISO_SALVO}>Configuração salva.</div>}
      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <form action="/api/leads-config" method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <CartaoDeSecao
          titulo="Palavra-chave pra começar"
          descricao="Quando a mensagem do cliente contém uma dessas palavras, o bot inicia a qualificação. Separe várias por vírgula."
        >
          <div>
            <label className={CLASSE_RÓTULO}>Palavras-chave</label>
            <input
              type="text"
              name="palavra_chave_lead"
              defaultValue={config.palavra_chave_lead ?? ""}
              placeholder="imóvel, apartamento, casa, alugar, comprar"
              className={CLASSE_CAMPO}
            />
            <p className={CLASSE_AJUDA}>Sem acento ou maiúscula importa — a comparação ignora os dois.</p>
          </div>
        </CartaoDeSecao>

        <CartaoDeSecao
          titulo="Perguntas de qualificação"
          descricao="Marque as que o bot deve perguntar — sempre nessa ordem, uma por vez. Desmarcar uma não afeta conversas já em andamento até a próxima vez que alguém iniciar."
        >
          <div className="flex flex-col gap-2.5">
            {PERGUNTAS_DISPONIVEIS.map((p) => (
              <label key={p.id} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="leads_pergunta"
                  value={p.id}
                  defaultChecked={perguntasAtivas.includes(p.id)}
                  className={`${CLASSE_CHECKBOX} mt-0.5`}
                />
                <span className="text-sm text-neutral-200">
                  {p.rotulo}
                  <span className="block text-xs text-neutral-500">&ldquo;{p.pergunta}&rdquo;</span>
                </span>
              </label>
            ))}
          </div>
        </CartaoDeSecao>

        <CartaoDeSecao
          titulo="WhatsApp do responsável"
          descricao="Pra onde vai o resumo de cada lead qualificado — nome do cliente e as respostas coletadas. Deixe em branco pra não mandar WhatsApp (o lead continua salvo e visível aqui)."
        >
          <WhatsAppsAdminLeadsEditor valorInicial={config.leads_admin_whatsapp ?? ""} />
        </CartaoDeSecao>

        <button type="submit" className={CLASSE_BOTAO_SALVAR}>
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
