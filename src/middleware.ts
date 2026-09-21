import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  NOME_DO_COOKIE_DE_SESSAO,
  NOME_DO_COOKIE_DE_VERIFICACAO,
  NOME_DO_COOKIE_DE_CONTA_ATIVA,
  NOME_DO_HEADER_DE_CARIMBO,
  criarCarimboDeContaAtiva,
  criarCarimboDeVerificacao,
  lerCarimboDeContaAtiva,
  lerCarimboDeVerificacao,
  validarSessaoDeFuncionario,
} from "@/lib/funcionarios-cookie";

/**
 * Exige login em todo o painel (/contas e tudo dentro dele — configuração do Gemini, palavras-
 * chave, reserva, histórico de atendimentos com nome/@usuário/WhatsApp de cliente, funcionários) e
 * em toda rota de API que muda ou lê esses dados. Fica de fora só o que precisa ser acessível sem
 * sessão de verdade:
 * - `api/webhook/instagram`: quem chama é a Meta, não o navegador do Victor — validado pela
 *   própria assinatura HMAC (`X-Hub-Signature-256`), não por login.
 * - `/login`: senão ninguém conseguiria nem chegar na tela de login pra entrar.
 *
 * Mesmo padrão de autenticação (Supabase Auth por sessão/cookie) já usado no agendador-stories e
 * no ShoppingHub — inclusive o mesmo usuário já cadastrado lá funciona aqui, sem precisar criar
 * nada novo, porque os três projetos compartilham o mesmo projeto Supabase.
 *
 * `/reservas`, `/reservas/antigas` e `/reservas/futuras` (e seu logout) têm uma segunda porta de
 * entrada, totalmente separada: o login próprio dos funcionários do restaurante
 * (`chatbot_funcionarios`/`chatbot_funcionario_sessoes`, ver src/lib/funcionarios.ts) — pensado só
 * pra dar acesso às telas de reservas, sem enxergar mais nada do painel (`/reservas/log` fica de
 * fora de propósito). O Victor continua vendo essas mesmas telas com a sessão normal dele.
 * Se a conta for pausada (botão "Pausar" em /contas), a sessão do funcionário passa a contar como
 * inválida também — mesmo quem já estava logado é redirecionado pro login com uma mensagem
 * específica (`validarSessaoDeFuncionario`, em src/lib/funcionarios-cookie.ts).
 *
 * Falha "aberta" (deixa passar sem exigir login) só se faltar configurar
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — evita derrubar o site inteiro por um esquecimento de
 * variável de ambiente; ainda assim registra um erro no log pra não passar despercebido.
 *
 * Usa `getSession()` em vez de `getUser()` de propósito: `getUser()` sempre faz uma chamada de
 * rede pro servidor do Supabase confirmar a sessão, em TODA navegação — com pouquíssima gente
 * usando o site (só o Victor e alguns funcionários de restaurante), esse round-trip extra em
 * cada clique só deixa tudo mais lento sem ganho real de segurança. `getSession()` confere a
 * validade da sessão localmente (o token já vem assinado pelo Supabase) e só faz uma chamada de
 * rede quando o token precisa renovar (por padrão, a cada 1h) — na prática vira "confere de
 * verdade umas poucas vezes por dia" em vez de "toda hora".
 */
// Domínio próprio comprado só pra reserva externa (/r/[slug]) — automesa.com.br/unico é a MESMA
// página que /r/unico no domínio de sempre, só com uma URL mais bonita pro cliente final ler no
// link. Sem essa reescrita, o domínio custom cairia direto na home (ou 404) do app inteiro em vez
// da página de reserva certa.
const DOMINIOS_DA_RESERVA_EXTERNA = ["automesa.com.br", "www.automesa.com.br"];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  // true só quando o caminho foi trocado por baixo dos panos (ver bloco abaixo) e ainda falta
  // devolver isso como rewrite lá na isenção de login — reserva externa (/r/[slug]) já devolve
  // direto ali embaixo, não precisa dessa flag.
  let precisaReescrever = false;

  if (DOMINIOS_DA_RESERVA_EXTERNA.some((dominio) => host === dominio || host.startsWith(`${dominio}:`))) {
    const caminhoOriginal = request.nextUrl.pathname;

    // automesa.com.br/login — porta de entrada dos funcionários nesse domínio novo, mesmo login de
    // sempre por baixo. Só troca o caminho aqui (em request.nextUrl, que o resto da função lê de
    // novo mais abaixo) — a isenção de sessão e toda a checagem de funcionário continuam rodando
    // normalmente pra "/reservas/login", sem duplicar nenhuma regra de acesso aqui.
    if (caminhoOriginal === "/login") {
      request.nextUrl.pathname = "/reservas/login";
      precisaReescrever = true;
    } else if (caminhoOriginal === "/") {
      // automesa.com.br sem nada depois — a home de vendas do produto, não o redirect pra
      // /contas que "/" faz no domínio de sempre (ver src/app/page.tsx). Pública, sem checagem de
      // sessão, devolve na hora — mesmo espírito da reserva externa logo abaixo.
      request.nextUrl.pathname = "/site";
      return NextResponse.rewrite(request.nextUrl);
    } else if (
      // "/" (sem slug nenhum), /reservas (painel do funcionário inteiro, todas as sub-rotas), assets
      // estáticos (_next), API e qualquer caminho com extensão de arquivo (favicon.ico,
      // manifest.webmanifest, robots.txt...) seguem pro resto da função sem mexer no caminho — são
      // rotas de verdade do app, cada uma com sua própria regra de acesso mais abaixo.
      caminhoOriginal !== "/" &&
      !caminhoOriginal.startsWith("/_next") &&
      !caminhoOriginal.startsWith("/api") &&
      !caminhoOriginal.startsWith("/reservas") &&
      !caminhoOriginal.includes(".")
    ) {
      // Reserva externa (automesa.com.br/algumSlug -> /r/algumSlug) é sempre pública — nunca passa
      // pela checagem de sessão abaixo, devolve na hora.
      request.nextUrl.pathname = `/r${caminhoOriginal}`;
      return NextResponse.rewrite(request.nextUrl);
    }
  }

  const { pathname } = request.nextUrl;

  // Público de propósito: a tela de login (do Victor e a do funcionário) e o envio do formulário
  // da segunda — ninguém consegue nem chegar ali se essas rotas também exigirem estar logado.
  // `/login` faltava aqui: a checagem de sessão sempre falhava pra quem ainda não tinha logado (óbvio,
  // é a própria tela de login) e redirecionava de volta pra "/login" — um loop infinito de
  // redirecionamento ("too many redirects"). Só não dava pra notar antes porque, sem
  // NEXT_PUBLIC_SUPABASE_ANON_KEY configurada, o middleware inteiro "falhava aberto" (deixava
  // passar sem checar nada) — assim que essa variável foi configurada certo, essa checagem passou
  // a rodar de verdade e expôs o loop que já existia aqui.
  if (
    pathname === "/login" ||
    pathname === "/reservas/login" ||
    pathname === "/api/reservas/login"
  ) {
    return precisaReescrever ? NextResponse.rewrite(request.nextUrl) : NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chaveAnonima) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada — login desativado temporariamente."
    );
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, chaveAnonima, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return response;
  }

  // Cobre as três telas de reservas (Hoje/Antigas/Futuras, ver src/app/reservas/PainelDeReservas.tsx)
  // e /api/reservas/* (logout, editar, excluir reserva) — todas aceitam sessão de funcionário, não
  // só a do Victor. /reservas/log fica de fora de propósito (só admin).
  const ehRotaDeReservas =
    pathname === "/reservas" ||
    pathname === "/reservas/antigas" ||
    pathname === "/reservas/futuras" ||
    pathname.startsWith("/api/reservas/");

  if (ehRotaDeReservas) {
    const tokenDeSessao = request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value;
    const segredoDoCarimbo = process.env.FUNCIONARIO_SESSAO_SECRET;
    const admin = criarClienteAdmin();

    // Caminho rápido: já tem um carimbo de IDENTIDADE válido (confirmado no banco há menos de 7
    // dias, ver JANELA_DE_CONFIANCA_MS em funcionarios-cookie.ts) — segue sem reconsultar quem é a
    // pessoa. Combinado com o Victor (10/09): não precisa reconferir a cada abertura do app, só de
    // vez em quando é suficiente. Sem FUNCIONARIO_SESSAO_SECRET configurada, isso nunca bate (fica
    // sempre no caminho de baixo, idêntico ao comportamento de antes — nada quebra).
    const carimboExistente = await lerCarimboDeVerificacao(
      request.cookies.get(NOME_DO_COOKIE_DE_VERIFICACAO)?.value,
      tokenDeSessao,
      segredoDoCarimbo
    );

    if (carimboExistente) {
      const headersComCarimbo = new Headers(request.headers);
      headersComCarimbo.set(NOME_DO_HEADER_DE_CARIMBO, request.cookies.get(NOME_DO_COOKIE_DE_VERIFICACAO)!.value);

      // Identidade OK — falta só saber se a conta continua ativa "recente o bastante" (até ~45s,
      // bem dentro do "até 1 minuto" combinado com o Victor pra cortar acesso de quem foi pausado
      // por falta de pagamento). Isso ANTES rodava em toda página, sem cache nenhum (lento) — e uma
      // falha passageira nessa consulta derrubava a pessoa pro login na hora, parecendo um bug de
      // "desloga sozinho". Agora só consulta de novo quando esse carimbo curto vence, e uma falha
      // aqui FALHA ABERTO (não desloga ninguém) em vez de barrar por engano.
      const contaAindaConfirmadaAtiva = await lerCarimboDeContaAtiva(
        request.cookies.get(NOME_DO_COOKIE_DE_CONTA_ATIVA)?.value,
        carimboExistente.contaId,
        segredoDoCarimbo
      );
      if (contaAindaConfirmadaAtiva) {
        return NextResponse.next({ request: { headers: headersComCarimbo } });
      }

      const { data: contaAtual, error: erroAoConferirAtiva } = await admin
        .from("chatbot_accounts")
        .select("active")
        .eq("id", carimboExistente.contaId)
        .maybeSingle();

      if (contaAtual && !contaAtual.active) {
        const destino = request.nextUrl.clone();
        destino.pathname = "/reservas/login";
        destino.searchParams.set("indisponivel", "1");
        const respostaDePausa = NextResponse.redirect(destino);
        respostaDePausa.cookies.delete(NOME_DO_COOKIE_DE_VERIFICACAO);
        respostaDePausa.cookies.delete(NOME_DO_COOKIE_DE_CONTA_ATIVA);
        return respostaDePausa;
      }

      if (erroAoConferirAtiva) {
        console.error("Falha ao conferir se a conta segue ativa — deixando passar (falha aberta).", erroAoConferirAtiva);
      }

      // Ativa de verdade (ou não deu pra confirmar — mesmo raciocínio de falha aberta acima):
      // renova o carimbo curto por mais ~45s, evitando bater no banco de novo no próximo clique.
      const respostaOk = NextResponse.next({ request: { headers: headersComCarimbo } });
      if (segredoDoCarimbo) {
        const novoCarimboDeAtiva = await criarCarimboDeContaAtiva(carimboExistente.contaId, segredoDoCarimbo);
        respostaOk.cookies.set(NOME_DO_COOKIE_DE_CONTA_ATIVA, novoCarimboDeAtiva, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60,
        });
      }
      return respostaOk;
    }

    // Caminho lento: consulta de verdade no banco (já confere identidade E "active" nesse mesmo
    // instante) — acontece na primeira vez, quando o carimbo de identidade vence, ou se a
    // máquina/config não tiver o segredo configurado.
    const resultado = await validarSessaoDeFuncionario(admin, tokenDeSessao);

    if (resultado.valida) {
      const headersComCarimbo = new Headers(request.headers);
      let novoCarimbo: string | null = null;
      let novoCarimboDeAtiva: string | null = null;

      if (segredoDoCarimbo && tokenDeSessao) {
        novoCarimbo = await criarCarimboDeVerificacao(tokenDeSessao, resultado.dados, segredoDoCarimbo);
        headersComCarimbo.set(NOME_DO_HEADER_DE_CARIMBO, novoCarimbo);
        // Acabou de confirmar "active" no banco agora mesmo — aproveita e já gera o carimbo curto
        // também, evitando uma consulta extra logo no próximo clique.
        novoCarimboDeAtiva = await criarCarimboDeContaAtiva(resultado.dados.contaId, segredoDoCarimbo);
      }

      const respostaValida = NextResponse.next({ request: { headers: headersComCarimbo } });
      if (novoCarimbo) {
        respostaValida.cookies.set(NOME_DO_COOKIE_DE_VERIFICACAO, novoCarimbo, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // mesma validade do cookie de sessão — o carimbo em si já
          // tem sua própria janela de confiança mais curta checada em lerCarimboDeVerificacao.
        });
      }
      if (novoCarimboDeAtiva) {
        respostaValida.cookies.set(NOME_DO_COOKIE_DE_CONTA_ATIVA, novoCarimboDeAtiva, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60,
        });
      }
      return respostaValida;
    }

    const destino = request.nextUrl.clone();
    destino.pathname = "/reservas/login";
    // Conta pausada (botão "Pausar" em /contas) — mesmo quem já estava logado é barrado, com uma
    // mensagem específica em vez do erro genérico de "faça login" (ver /reservas/login/page.tsx).
    if (resultado.motivo === "conta_pausada") {
      destino.searchParams.set("indisponivel", "1");
    }
    const respostaDeRedirecionamento = NextResponse.redirect(destino);
    // Carimbo de uma sessão que acabou de se provar inválida/pausada não serve mais — limpa pra
    // não ficar tentando de novo no próximo request com o mesmo resultado.
    respostaDeRedirecionamento.cookies.delete(NOME_DO_COOKIE_DE_VERIFICACAO);
    respostaDeRedirecionamento.cookies.delete(NOME_DO_COOKIE_DE_CONTA_ATIVA);
    return respostaDeRedirecionamento;
  }

  const destino = request.nextUrl.clone();
  destino.pathname = "/login";
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: [
    // manifest.webmanifest (agora um arquivo estático, não mais gerado pelo Next — ver
    // src/app/manifest.ts removido) e o mesmo conjunto de arquivos específicos de /reservas
    // precisam ficar públicos pelo mesmo motivo do favicon/ícone principal: quem busca esses
    // arquivos é o navegador (pra montar o atalho na tela de início) OU a própria tela de login do
    // funcionário antes de ele logar — nenhum dos dois tem sessão de admin.
    // sw.js (service worker das notificações push) também precisa ficar público — o navegador
    // busca esse arquivo sozinho, sem sessão nenhuma, pra manter o registro atualizado.
    // reservas-splash.mp4 (vídeo da tela de abertura) pelo mesmo motivo: a splash aparece até na
    // tela de login do funcionário (a pessoa ainda nem tem sessão nesse momento).
    // reservas-avatares/ (fotos cadastradas à mão, ver foto_manual_url em PainelDeReservas.tsx):
    // é o próprio navegador de quem já está logado que busca essa imagem direto via <img src>,
    // fora do fluxo de navegação normal — sem essa exceção cai no redirecionamento pra /login lá
    // embaixo, que devolve HTML em vez da imagem (ícone de imagem quebrada na tela).
    // r/ (reserva externa, ver src/app/r/[slug]/page.tsx): link público que o próprio cliente
    // final abre direto — ele nunca tem sessão nenhuma, nem de admin nem de funcionário.
    // api/r/ (src/app/api/r/[slug]/*): as chamadas fetch que essa mesma página pública faz pro
    // calendário/disponibilidade/confirmação — o navegador do cliente final as dispara direto,
    // sem cookie de sessão nenhum, então também precisam ficar de fora do redirecionamento.
    // api/site/ (src/app/api/site/contato/route.ts): o formulário de contato da home de vendas
    // (/site) — visitante nunca tem sessão nenhuma, igual a reserva externa acima.
    "/((?!api/webhook/instagram|api/r/|api/site/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw.js|reservas/icon.png|reservas/apple-icon.png|reservas-manifest.webmanifest|reservas-logo.png|reservas-icon.png|reservas-splash.mp4|reservas-avatares/|r/|site$).*)",
  ],
};
