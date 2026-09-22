// Envio de WhatsApp via Kapso (REST API pura, sem SDK — mesmo padrão de email.ts/sendpulseApi.ts).
// Kapso é um proxy 1:1 da API oficial do WhatsApp Cloud (Meta): mesmo formato de payload, só troca
// o domínio e a autenticação (X-API-Key em vez do token de sistema da Meta). Endpoint e formato
// confirmados na documentação oficial (docs.kapso.ai) em 22/09/2026.
//
// Só manda TEMPLATE aprovado (nunca texto livre) — as duas situações de uso (lembrete de reserva
// pro cliente, alerta de lotação pro admin) são sempre mensagens que O SISTEMA inicia, nunca uma
// resposta a algo que o destinatário mandou nas últimas 24h. A API do WhatsApp recusa mensagem de
// texto livre fora dessa janela; só template pré-aprovado pela Meta funciona sempre.
const KAPSO_API_URL = "https://api.kapso.ai/meta/whatsapp/v24.0";

/** "11999998888" -> "5511999998888". Números digitados já com código do país (12-13 dígitos) ficam
 * como estão — só completa quando parece um número brasileiro sem o 55 na frente. */
function normalizarNumeroBR(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

/** Nunca lança erro pra quem chama — uma falha de WhatsApp não pode travar a reserva nem o cron.
 * Devolve `true`/`false` porque, ao contrário de um e-mail de aviso interno, aqui uma falha
 * silenciosa vira "o cliente não foi lembrado" ou "o admin não soube que lotou" — quem chama decide
 * se precisa contar isso (ver contadores de ResultadoDoLembrete em lembreteDeReserva.ts). */
export async function enviarWhatsAppTemplate(
  numero: string,
  nomeTemplate: string,
  idioma: string,
  parametros: string[]
): Promise<boolean> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    console.error("Kapso não configurado — faltam KAPSO_API_KEY/KAPSO_PHONE_NUMBER_ID.");
    return false;
  }

  try {
    const resposta = await fetch(`${KAPSO_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizarNumeroBR(numero),
        type: "template",
        template: {
          name: nomeTemplate,
          language: { code: idioma },
          components: parametros.length
            ? [{ type: "body", parameters: parametros.map((texto) => ({ type: "text", text: texto })) }]
            : undefined,
        },
      }),
      cache: "no-store",
    });

    if (!resposta.ok) {
      const corpoDoErro = await resposta.text().catch(() => "");
      console.error(`Kapso recusou envio de WhatsApp (${resposta.status}, template ${nomeTemplate}): ${corpoDoErro}`);
      return false;
    }

    return true;
  } catch (erro) {
    console.error(`Falha ao enviar WhatsApp via Kapso (template ${nomeTemplate}):`, erro);
    return false;
  }
}
