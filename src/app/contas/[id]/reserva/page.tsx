import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import DatasBloqueadasEditor from "./DatasBloqueadasEditor";
import WhatsAppsAdminEditor from "./WhatsAppsAdminEditor";
import CorDeDestaqueEditor from "./CorDeDestaqueEditor";
import LinkExternoEditor from "../LinkExternoEditor";
import {
  CLASSE_CAMPO,
  CLASSE_CAMPO_TEXTAREA,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
  CLASSE_CHECKBOX,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
  CLASSE_SECAO,
  CLASSE_TITULO_SECAO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ReservaConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();

  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select(
      "palavra_chave_reserva, reserva_habilitada, reserva_regras_texto, reserva_limite_normal, reserva_limite_maximo, reserva_limite_maximo_jantar, reserva_mensagem_limite_maximo, reserva_cutoff_horario, reserva_pausa_ativa, reserva_pausa_data, reserva_pausa_mensagem, google_sheet_id, reserva_msg_inicial, reserva_msg_pergunta_data, reserva_msg_pergunta_periodo, reserva_msg_pergunta_pessoas, reserva_msg_pergunta_whatsapp, reserva_msg_confirmada, reserva_msg_recusada, reserva_datas_bloqueadas, palavra_chave_alterar_reserva, alteracao_cutoff_horario, reserva_lembrete_habilitado, reserva_lembrete_horario, reserva_lembrete_mensagem, reserva_admin_whatsapp"
    )
    .eq("account_id", params.id)
    .maybeSingle();

  // Cor de destaque e slug (link externo) moram em chatbot_accounts, não em
  // chatbot_account_settings como o resto dessa tela — slug é a MESMA coluna editável também
  // pela aba Agendamento (ver LinkExternoEditor.tsx), não uma cópia separada por serviço.
  const { data: conta } = await admin
    .from("chatbot_accounts")
    .select("cor_destaque_manual, slug")
    .eq("id", params.id)
    .maybeSingle();

  // Postgres devolve hora como "18:00:00" — o campo <input type="time"> espera "18:00".
  const cutoffParaInput = config?.reserva_cutoff_horario
    ? config.reserva_cutoff_horario.slice(0, 5)
    : "";
  const cutoffAlteracaoParaInput = config?.alteracao_cutoff_horario
    ? config.alteracao_cutoff_horario.slice(0, 5)
    : "";
  const lembreteHorarioParaInput = config?.reserva_lembrete_horario
    ? config.reserva_lembrete_horario.slice(0, 5)
    : "18:40";

  // Reservas desligadas nessa conta (botão "Ativar/desativar reservas" em /contas) — nem mostra a
  // configuração, só o jeito de ligar de novo. Isso é o interruptor GERAL da função, diferente da
  // "Pausar reservas temporariamente" lá embaixo (que só troca a mensagem enquanto a função
  // continua ligada e configurada).
  if (!config?.reserva_habilitada) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Reserva</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Fluxo automático de reserva: só entra em ação quando o cliente manda a palavra-chave
          configurada aqui. Depois disso, o bot pergunta data, período, quantidade de pessoas e
          WhatsApp, mostra as regras e pede confirmação — tudo por conta própria.
        </p>

        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">
            Reservas estão desativadas pra essa conta — a configuração fica escondida e o bot
            nunca entra nesse fluxo até você ativar.
          </p>
          <form action="/api/contas/reservas-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/reserva`} />
            <Interruptor ligado={false} rotulo="Ativar Reservas" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Reserva</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Fluxo automático de reserva: só entra em ação quando o cliente manda a palavra-chave
            configurada aqui. Depois disso, o bot pergunta data, período, quantidade de pessoas e
            WhatsApp, mostra as regras e pede confirmação — tudo por conta própria.
          </p>
        </div>
        <form action="/api/contas/reservas-status" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={`/contas/${params.id}/reserva`} />
          <Interruptor
            ligado={true}
            rotulo="Reservas ativas"
            mensagemConfirmarDesligar="Tem certeza que deseja desativar reservas nessa conta? O bot para de aceitar novas reservas, a configuração fica escondida e ela some do dropdown de reservas até você ativar de novo."
          />
        </form>
      </div>

      {searchParams.salvo && (
        <div className={CLASSE_AVISO_SALVO}>
          Configuração salva.
        </div>
      )}

      {searchParams.erro && (
        <div className={CLASSE_AVISO_ERRO}>
          {searchParams.erro}
        </div>
      )}

      <form action="/api/reserva-config" method="POST" className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className={CLASSE_RÓTULO}>
            Palavra-chave que inicia o fluxo de reserva
          </label>
          <input
            type="text"
            name="palavra_chave_reserva"
            defaultValue={config?.palavra_chave_reserva ?? ""}
            placeholder="Ex: reserva, reservar, quero reservar"
            className={CLASSE_CAMPO}
          />
          <p className={CLASSE_AJUDA}>
            Pode escrever mais de uma variação separada por vírgula.
          </p>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Link de acesso do cliente</p>
          <p className={CLASSE_AJUDA}>
            Endereço que você manda pro cliente pra ele reservar direto (fora do Instagram) — a
            mesma conta pode editar esse link por aqui ou pela aba Agendamento, é sempre um só.
          </p>
          <div className="mt-3">
            <LinkExternoEditor valorInicial={conta?.slug ?? null} />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Aparência da reserva externa</p>
          <p className={CLASSE_AJUDA}>
            Cor do brilho de fundo e dos botões na página pública de reserva (/r/...). Em branco,
            usa uma cor calculada automaticamente a partir do logo do Instagram — preencha aqui só
            se quiser escolher o tom exato à mão.
          </p>
          <div className="mt-3">
            <CorDeDestaqueEditor valorInicial={conta?.cor_destaque_manual ?? ""} />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Mensagens do bot</p>
          <p className={CLASSE_AJUDA}>
            Cada campo abaixo é o que o bot manda naquele momento da conversa. Deixe em branco pra
            usar o texto padrão (mostrado como exemplo no próprio campo).
          </p>

          <div className="mt-4">
            <label className={CLASSE_RÓTULO}>Saudação inicial</label>
            <p className={CLASSE_AJUDA}>
              Mandada assim que o cliente digita a palavra-chave, antes da primeira pergunta. Se
              deixar em branco, o bot não manda saudação nenhuma e já começa perguntando a data.
            </p>
            <textarea
              name="reserva_msg_inicial"
              rows={2}
              defaultValue={config?.reserva_msg_inicial ?? ""}
              placeholder="(em branco = sem saudação, vai direto pra pergunta da data)"
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>

          <div className="mt-4">
            <label className={CLASSE_RÓTULO}>Pergunta 1 — data</label>
            <p className={CLASSE_AJUDA}>
              Pergunta pro cliente escolher o dia da reserva (aparece junto com os botões Hoje,
              Amanhã e Outro dia).
            </p>
            <textarea
              name="reserva_msg_pergunta_data"
              rows={2}
              defaultValue={config?.reserva_msg_pergunta_data ?? ""}
              placeholder="Pra qual dia você quer reservar? Toque num botão abaixo ou digite: Hoje, Amanhã, Outro dia."
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>

          <div className="mt-4">
            <label className={CLASSE_RÓTULO}>Pergunta 2 — período</label>
            <p className={CLASSE_AJUDA}>
              Pergunta se é Almoço ou Jantar (aparece junto com os botões).
            </p>
            <textarea
              name="reserva_msg_pergunta_periodo"
              rows={2}
              defaultValue={config?.reserva_msg_pergunta_periodo ?? ""}
              placeholder="É pro Almoço ou Jantar?"
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>

          <div className="mt-4">
            <label className={CLASSE_RÓTULO}>Pergunta 3 — quantidade de pessoas</label>
            <p className={CLASSE_AJUDA}>
              Pergunta quantas pessoas vão na reserva.
            </p>
            <textarea
              name="reserva_msg_pergunta_pessoas"
              rows={2}
              defaultValue={config?.reserva_msg_pergunta_pessoas ?? ""}
              placeholder="Pra quantas pessoas é a reserva?"
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>

          <div className="mt-4">
            <label className={CLASSE_RÓTULO}>Pergunta 4 — WhatsApp</label>
            <p className={CLASSE_AJUDA}>
              Pede o número de WhatsApp pra contato, depois disso o bot mostra as Regras (campo
              logo abaixo) e pede a confirmação final.
            </p>
            <textarea
              name="reserva_msg_pergunta_whatsapp"
              rows={2}
              defaultValue={config?.reserva_msg_pergunta_whatsapp ?? ""}
              placeholder="Qual o melhor WhatsApp pra contato?"
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>
            Regras (mostradas antes do pedido de confirmação)
          </label>
          <textarea
            name="reserva_regras_texto"
            rows={6}
            defaultValue={config?.reserva_regras_texto ?? ""}
            placeholder="Ex: tolerância de 15 minutos, mesa liberada após esse prazo"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Mensagem quando a reserva é confirmada</label>
          <p className={CLASSE_AJUDA}>
            Última mensagem do fluxo, mandada depois que o cliente toca em "Sim, confirmar".
          </p>
          <textarea
            name="reserva_msg_confirmada"
            rows={3}
            defaultValue={config?.reserva_msg_confirmada ?? ""}
            placeholder="Reserva confirmada! Te esperamos por lá. Qualquer mudança, é só chamar por aqui de novo."
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Mensagem quando o cliente cancela</label>
          <p className={CLASSE_AJUDA}>
            Mandada quando o cliente toca em "Não, cancelar" na confirmação final.
          </p>
          <textarea
            name="reserva_msg_recusada"
            rows={3}
            defaultValue={config?.reserva_msg_recusada ?? ""}
            placeholder="Sem problema, fica pra próxima! Se quiser reservar depois, é só chamar de novo."
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>
            Limite normal de pessoas (só informativo)
          </label>
          <input
            type="number"
            min={0}
            name="reserva_limite_normal"
            defaultValue={config?.reserva_limite_normal ?? ""}
            className={CLASSE_CAMPO}
          />
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Capacidade máxima de pessoas</p>
          <p className={CLASSE_AJUDA}>
            Um número pra cada período — é a SOMA de todas as reservas já confirmadas pra aquele
            dia+período. Assim que bater nesse número, ninguém mais consegue reservar pra esse
            período — nem uma reserva pequena que ainda caberia, se pedir mais do que o que sobrou.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CLASSE_RÓTULO}>Almoço</label>
              <input
                type="number"
                min={0}
                name="reserva_limite_maximo"
                defaultValue={config?.reserva_limite_maximo ?? ""}
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label className={CLASSE_RÓTULO}>Jantar</label>
              <p className={CLASSE_AJUDA}>
                Em branco usa o mesmo número do Almoço.
              </p>
              <input
                type="number"
                min={0}
                name="reserva_limite_maximo_jantar"
                defaultValue={config?.reserva_limite_maximo_jantar ?? ""}
                className={CLASSE_CAMPO}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Mensagem quando passa do limite máximo</label>
          <textarea
            name="reserva_mensagem_limite_maximo"
            rows={3}
            defaultValue={config?.reserva_mensagem_limite_maximo ?? ""}
            placeholder="Nossas reservas do dia já estão encerradas porque todas as mesas já foram preenchidas. Nosso atendimento será apenas por ordem de chegada."
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>
            Horário limite pra reservar "Hoje" (depois disso, some a opção "Hoje" — "Amanhã" e
            "Outro dia" continuam disponíveis)
          </label>
          <input
            type="time"
            name="reserva_cutoff_horario"
            defaultValue={cutoffParaInput}
            className={CLASSE_CAMPO}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>ID da planilha do Google Sheets</label>
          <input
            type="text"
            name="google_sheet_id"
            defaultValue={config?.google_sheet_id ?? ""}
            placeholder="Cola aqui só o ID (o trecho entre /d/ e /edit na URL da planilha)"
            className={CLASSE_CAMPO}
          />
        </div>

        <div className={CLASSE_SECAO}>
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input
              type="checkbox"
              name="reserva_pausa_ativa"
              defaultChecked={config?.reserva_pausa_ativa ?? false}
              className={CLASSE_CHECKBOX}
            />
            Pausar reservas temporariamente
          </label>
          <p className={CLASSE_AJUDA}>
            Enquanto estiver marcado, quem mandar a palavra-chave de reserva recebe a mensagem
            abaixo em vez de começar o fluxo. Importante: isso não desliga sozinho depois de um
            tempo — fica pausado até você desmarcar essa caixinha aqui manualmente.
          </p>

          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>Até quando (opcional, só anotação)</label>
            <p className={CLASSE_AJUDA}>
              Isso aqui é só um lembrete visual pra você — o sistema não desmarca a pausa sozinho
              nessa data, é preciso desmarcar a caixinha "Pausar reservas temporariamente" à mão.
            </p>
            <input
              type="date"
              name="reserva_pausa_data"
              defaultValue={config?.reserva_pausa_data ?? ""}
              className={CLASSE_CAMPO}
            />
          </div>

          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>Mensagem durante a pausa</label>
            <textarea
              name="reserva_pausa_mensagem"
              rows={3}
              defaultValue={config?.reserva_pausa_mensagem ?? ""}
              placeholder="No momento não estamos aceitando novas reservas por aqui. Assim que reabrirmos, avisamos por aqui."
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Bloquear datas específicas</p>
          <p className={CLASSE_AJUDA}>
            Diferente da pausa acima (que trava TUDO na hora), isso aqui bloqueia só os dias que
            você escolher — o resto do fluxo continua funcionando normal, só que ninguém consegue
            reservar pra esses dias específicos (nem clicando em "Hoje"/"Amanhã" quando bater
            numa dessas datas, nem digitando a data na mão).
          </p>
          <div className="mt-3">
            <DatasBloqueadasEditor
              nome="reserva_datas_bloqueadas"
              valorInicial={config?.reserva_datas_bloqueadas ?? ""}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Alterar reserva já feita</p>
          <p className={CLASSE_AJUDA}>
            Deixa o cliente mudar a QUANTIDADE de pessoas de uma reserva que já fez, direto pelo
            Direct — pra mudar de dia, ele precisa fazer uma reserva nova. Dispara quando a
            mensagem tem a palavra-chave de reserva (acima) JUNTO com uma das palavras de alteração
            abaixo (ex: "quero mudar minha reserva pra 9 pessoas").
          </p>

          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>Palavras que indicam alteração</label>
            <input
              type="text"
              name="palavra_chave_alterar_reserva"
              defaultValue={config?.palavra_chave_alterar_reserva ?? ""}
              placeholder="mudar, alterar, trocar, editar, aumentar, diminuir, adicionar, remover"
              className={CLASSE_CAMPO}
            />
            <p className={CLASSE_AJUDA}>
              Pode escrever mais de uma variação separada por vírgula. Em branco usa a lista padrão
              mostrada como exemplo.
            </p>
          </div>

          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>
              Horário limite, NO DIA da reserva, pra ainda poder alterar (depois disso, o bot avisa
              que não dá mais e pede pra informar direto na chegada)
            </label>
            <input
              type="time"
              name="alteracao_cutoff_horario"
              defaultValue={cutoffAlteracaoParaInput}
              className={CLASSE_CAMPO}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input
              type="checkbox"
              name="reserva_lembrete_habilitado"
              defaultChecked={config?.reserva_lembrete_habilitado ?? false}
              className={CLASSE_CHECKBOX}
            />
            Mandar lembrete de comparecimento por WhatsApp
          </label>
          <p className={CLASSE_AJUDA}>
            Todo dia, no horário abaixo, manda um lembrete por WhatsApp pra quem tem reserva
            confirmada pra HOJE — uma vez por pessoa, mesmo se ela tiver mais de uma reserva no dia.
            Só chega pra quem deixou o WhatsApp na hora de reservar.
          </p>

          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>Horário do lembrete</label>
            <input
              type="time"
              name="reserva_lembrete_horario"
              defaultValue={lembreteHorarioParaInput}
              className={CLASSE_CAMPO}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <label className={CLASSE_RÓTULO}>WhatsApp do admin (avisos de lotação)</label>
          <WhatsAppsAdminEditor valorInicial={config?.reserva_admin_whatsapp ?? ""} />
          <p className={CLASSE_AJUDA}>
            Recebe um WhatsApp automático quando o almoço ou o jantar de hoje atinge 50% e 100% da
            lotação — pode cadastrar mais de um número. Sem nenhum preenchido, essa conta não recebe
            esse aviso (o aviso dentro do painel continua funcionando normalmente).
          </p>
        </div>

        <button
          type="submit"
          className={CLASSE_BOTAO_SALVAR}
        >
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
