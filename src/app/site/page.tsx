import { Fraunces, Outfit } from "next/font/google";
import styles from "./pagina.module.css";
import { DefinicoesDoVidroLiquidoSite } from "./VidroLiquido";

// Home de vendas do produto (automesa.com.br — ver a reescrita "/" -> "/site" em src/middleware.ts
// pro domínio próprio). Sem nenhuma leitura de banco: é conteúdo institucional, igual pra todo
// visitante, então fica estático de propósito (mais rápido, sem custo de servidor por acesso).
export const metadata = {
  title: "AutoMesa — reservas que se administram sozinhas",
  description:
    "Sistema de reservas para restaurantes: atende no Instagram e por um link próprio, controla a lotação sozinho e dá um painel completo pra equipe.",
};

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--fonte-display",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fonte-ui",
  display: "swap",
});

const EMAIL_DE_CONTATO = "contato@automesa.com.br";

function IconeChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconeMedidor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20a8 8 0 1 0-8-8" />
      <path d="M12 12l4-3" />
      <path d="M4 20h16" />
    </svg>
  );
}
function IconeLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15l6-6" />
      <path d="M13 6l1-1a4 4 0 0 1 5.6 5.6l-2 2" />
      <path d="M11 18l-1 1A4 4 0 0 1 4.4 13.4l2-2" />
    </svg>
  );
}
function IconePainel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18M9 9v9" />
    </svg>
  );
}
function IconeAjustes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h0" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
function IconeSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" />
    </svg>
  );
}

export default function PaginaSite() {
  return (
    <div className={`${styles.pagina} ${fraunces.variable} ${outfit.variable}`}>
      <DefinicoesDoVidroLiquidoSite />
      <div className={styles.atmosfera}>
        <div className={`${styles.brilho} ${styles.o1}`} />
        <div className={`${styles.brilho} ${styles.o2}`} />
        <div className={`${styles.brilho} ${styles.o3}`} />
      </div>
      <div className={styles.grao} />

      <div className={styles.conteudo}>
        <nav className={styles.nav}>
          <div className={styles.marca}>
            <span className={styles.ponto} />
            AutoMesa
          </div>
          <div className={styles.navLinks}>
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href={`mailto:${EMAIL_DE_CONTATO}`}>Fale com a gente</a>
            <a href="/login" className={styles.navEntrar}>
              Entrar
            </a>
          </div>
        </nav>

        {/* ---------- hero ---------- */}
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Sistema de reservas para restaurantes</span>
            <h1 className={styles.heroTitulo}>Um sistema de reservas que trabalha sozinho, a noite toda.</h1>
            <p className={styles.heroSub}>
              Atende no Instagram Direct e por um link com a cara do seu restaurante, controla a lotação da casa em
              tempo real e dá pra sua equipe um painel que nenhum aplicativo pronto do mercado oferece.
            </p>
            <div className={styles.heroCtas}>
              <a href={`mailto:${EMAIL_DE_CONTATO}`} className={styles.ctaPrimario}>
                Fale com a gente
              </a>
              <a href="#como-funciona" className={styles.ctaSecundario}>
                Ver como funciona
              </a>
            </div>
            <p className={styles.heroNota}>Feito sob medida para restaurantes — não é um chatbot genérico adaptado.</p>
          </div>

          <div className={styles.telefoneWrap}>
            <div className={styles.telefone}>
              <div className={styles.mockNotch} />
              <div className={styles.telefoneTela}>
                <span className={styles.telefoneEyebrow}>Seu Restaurante</span>
                <h2 className={styles.telefoneTitulo}>Quantas pessoas?</h2>
                <div className={styles.mockCartao}>
                  <div className={styles.mockContador}>
                    <span className={styles.mockBotao}>–</span>
                    <span className={styles.mockNumero}>4</span>
                    <span className={styles.mockBotao}>+</span>
                  </div>
                  <div className={styles.mockCadeiras}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span key={i} className={`${styles.mockCadeira} ${i < 4 ? styles.acesa : ""}`} />
                    ))}
                  </div>
                  <div className={styles.mockBotaoPrincipal}>Continuar</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- problema ---------- */}
        <section className={styles.secao} id="problema">
          <span className={styles.eyebrow}>01 · O ponto de partida</span>
          <h2 className={styles.tituloSecao}>
            Por que ferramentas de automação prontas não resolvem um restaurante de verdade
          </h2>
          <p className={styles.dekSecao}>
            A maioria dos sistemas de automação de Instagram do mercado foi pensada para responder perguntas simples
            — não para tocar a operação de reservas de uma casa, com lotação, horário de virada e uma equipe que
            precisa acompanhar tudo em tempo real.
          </p>

          <div className={styles.dorGrid}>
            <div className={styles.dorCard}>
              <span className={styles.dorTag}>Limite de lotação</span>
              <p>
                Não sabem quantas pessoas já estão confirmadas pro almoço ou pro jantar. <b>Não existe controle de
                capacidade automático</b> — o risco de overbooking fica inteiro nas suas mãos.
              </p>
            </div>
            <div className={styles.dorCard}>
              <span className={styles.dorTag}>Fluxo engessado</span>
              <p>
                Funcionam só com botões fixos e menus decorados. O cliente que escreve naturalmente ("quero reservar
                pra sábado, 6 pessoas") frequentemente <b>trava o robô</b>.
              </p>
            </div>
            <div className={styles.dorCard}>
              <span className={styles.dorTag}>Sem painel de operação</span>
              <p>
                Você não tem uma tela pra ver as reservas do dia, editar ou acompanhar quem confirmou. <b>A
                informação fica presa dentro do próprio chat</b>.
              </p>
            </div>
            <div className={styles.dorCard}>
              <span className={styles.dorTag}>Zero controle de equipe</span>
              <p>
                Não dá pra dar acesso só da tela de reservas pra um funcionário sem também entregar toda a
                configuração sensível do negócio.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- recursos ---------- */}
        <section className={styles.secao} id="recursos">
          <span className={styles.eyebrow}>02 · O que você ganha</span>
          <h2 className={styles.tituloSecao}>
            Um atendente de reservas que nunca dorme, nunca erra a conta e nunca ultrapassa a lotação
          </h2>
          <p className={styles.dekSecao}>
            Todo o fluxo — da primeira mensagem até a reserva confirmada — foi desenhado pra rotina de um
            restaurante de verdade, direto no Instagram Direct ou num link só seu, sem o cliente precisar instalar
            nada.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeChat />
              </span>
              <h3>Atendimento natural, sem menu robótico</h3>
              <p>
                O cliente escreve do jeito que já escreveria pra um humano — o sistema entende data, período,
                quantidade de pessoas e WhatsApp direto na conversa.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeMedidor />
              </span>
              <h3>Controle automático de lotação</h3>
              <p>
                Cada reserva confirmada soma na capacidade do período. Ao chegar perto do limite, o sistema ainda
                dá uma pequena folga configurável antes de recusar — sem overbooking, sem mesa faltando.
              </p>
            </div>
            <div className={`${styles.featureCard} ${styles.destaque}`}>
              <span className={styles.featureIcone}>
                <IconeLink />
              </span>
              <h3>Link externo com a cara do seu restaurante</h3>
              <p>
                Além do Instagram, seus clientes reservam por um link só seu — com o seu logo e até o brilho de
                fundo adaptado automaticamente às cores da sua marca. Nada de tela genérica: parece um aplicativo
                feito sob medida, porque foi.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconePainel />
              </span>
              <h3>Painel em tempo real para a equipe</h3>
              <p>
                Reservas do dia, ocupação por período e WhatsApp a um toque — com login próprio da equipe, restrito
                só à tela de reservas.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeAjustes />
              </span>
              <h3>Regras 100% configuráveis</h3>
              <p>
                Horário de corte, datas bloqueadas, mensagens de cada etapa — tudo ajustável por você, sem depender
                de suporte técnico externo.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeSparkle />
              </span>
              <h3>Também responde o resto</h3>
              <p>
                Perguntas que não são sobre reserva — cardápio, horário, endereço — ficam por conta de uma
                inteligência artificial configurada com o tom e o conhecimento da sua casa.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- como funciona ---------- */}
        <section className={styles.secao} id="como-funciona">
          <span className={styles.eyebrow}>03 · Por dentro da conversa</span>
          <h2 className={styles.tituloSecao}>Por fora, perguntas curtas. Por dentro, uma casa cheia de regras cruzadas</h2>
          <p className={styles.dekSecao}>
            O cliente só vê perguntas indo e voltando. Por trás de cada uma, o sistema resolve lotação, regras de
            data e edição de reserva em tempo real.
          </p>

          <div className={styles.passos}>
            <span className={styles.passo}>Gatilho</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>Data</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>Período</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>Pessoas</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>WhatsApp</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>Confirmação</span>
            <span className={styles.seta}>→</span>
            <span className={styles.passo}>Registrada</span>
          </div>
        </section>

        {/* ---------- comparação ---------- */}
        <section className={styles.secao}>
          <span className={styles.eyebrow}>04 · A diferença</span>
          <h2 className={styles.tituloSecao}>Não é um chatbot genérico com um nome diferente</h2>
          <div className={styles.tabelaWrap}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th></th>
                  <th>Chatbots genéricos</th>
                  <th className={styles.destaque}>AutoMesa</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.rotulo}>Controle de lotação</td>
                  <td><span className={styles.x}>✕</span> manual, por sua conta</td>
                  <td className={styles.destaque}><span className={styles.check}>✓</span> automático, por período</td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Entende texto livre</td>
                  <td><span className={styles.x}>✕</span> só botões e menus fixos</td>
                  <td className={styles.destaque}><span className={styles.check}>✓</span> conversa natural</td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Painel de operação</td>
                  <td><span className={styles.x}>✕</span> informação presa no chat</td>
                  <td className={styles.destaque}><span className={styles.check}>✓</span> em tempo real, pra equipe</td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Acesso restrito pra equipe</td>
                  <td><span className={styles.x}>✕</span> tudo ou nada</td>
                  <td className={styles.destaque}><span className={styles.check}>✓</span> login próprio, só reservas</td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Link com a cara do seu negócio</td>
                  <td><span className={styles.x}>✕</span> tela genérica da plataforma</td>
                  <td className={styles.destaque}><span className={styles.check}>✓</span> seu logo, suas cores</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- cta final ---------- */}
        <section className={styles.ctaFinal}>
          <p className={styles.ctaFinalTitulo}>Pronto pra parar de contar cadeira à mão?</p>
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className={styles.ctaPrimario}>
            Fale com a gente
          </a>
        </section>

        <footer className={styles.rodape}>
          <span>© {new Date().getFullYear()} AutoMesa</span>
          <a href="/login" style={{ color: "inherit" }}>
            Entrar
          </a>
        </footer>
      </div>
    </div>
  );
}
