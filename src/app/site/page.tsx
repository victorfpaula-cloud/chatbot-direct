import { Fraunces, Outfit } from "next/font/google";
import styles from "./pagina.module.css";
import { DefinicoesDoVidroLiquidoSite } from "./VidroLiquido";
import { EfeitosDeRolagem } from "./EfeitosDeRolagem";

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
      <EfeitosDeRolagem />
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
              Atende no Instagram Direct e por um link com a cara do seu restaurante — só que os dois dividem o
              mesmo cérebro. Mesma lotação, mesmas regras, mesma reserva registrada. Não interessa por onde o
              cliente entrou: o controle nunca se divide.
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

        {/* ---------- recursos ---------- */}
        <section className={styles.secao} id="recursos">
          <span className={styles.eyebrow}>01 · O que você ganha</span>
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
              <h3>Conversa de verdade, não menu de robô</h3>
              <p>
                Seu cliente escreve como escreveria pra um garçom — &quot;quero reservar sábado pra 6&quot; já
                basta. O sistema entende data, horário, quantas pessoas e pega o WhatsApp na mesma conversa.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeMedidor />
              </span>
              <h3>Nunca mais estoure a lotação</h3>
              <p>
                Cada reserva confirmada entra na conta certinha, por almoço e por jantar. Perto do limite, ainda
                cabe uma folga pequena e configurável — sem virar overbooking, sem mesa faltando na hora.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeLink />
              </span>
              <h3>Um link com a cara do seu restaurante</h3>
              <p>
                Seu cliente também reserva fora do Instagram, num endereço só seu — com o seu logo e as cores da
                sua marca no brilho de fundo. Ele nunca vê uma tela genérica de plataforma.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconePainel />
              </span>
              <h3>Sua equipe vê tudo, na hora</h3>
              <p>
                Reservas do dia, ocupação por período, WhatsApp a um toque — num painel com login próprio pra
                equipe, sem acesso a mais nada do negócio.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeAjustes />
              </span>
              <h3>As regras são todas suas</h3>
              <p>
                Horário de corte, datas bloqueadas, o texto de cada etapa da conversa — tudo ajustável por você,
                na hora, sem abrir chamado com ninguém.
              </p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeSparkle />
              </span>
              <h3>E ainda resolve o resto sozinho</h3>
              <p>
                Cardápio, horário, endereço — o que não é reserva vai pra uma IA que já sabe o tom e os detalhes
                da sua casa, sem misturar com o fluxo de reservar.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- operação ---------- */}
        <section className={styles.secao} id="como-funciona">
          <div className={styles.operacaoGrid}>
            <div>
              <span className={styles.eyebrow}>02 · Zero trabalho operacional</span>
              <h2 className={styles.tituloSecao}>Sua equipe só recebe o cliente. A gente cuida do resto.</h2>
              <p className={styles.dekSecao}>
                Toda a operação e a programação ficam com a gente. Você não mexe em configuração nenhuma pra fazer
                funcionar — só organiza a mesa e recebe quem chega. A cada reserva nova, o aviso chega sozinho, e sua
                equipe acompanha tudo dentro do próprio painel, em tempo real.
              </p>
            </div>

            <div className={styles.painelMockWrap}>
              <div className={styles.toastNotificacao}>
                <span className={styles.toastPonto} />
                <div>
                  <b>Nova reserva confirmada</b>
                  <span>Ana Cordeiro · 4 pessoas · hoje às 20h</span>
                </div>
              </div>
              <div className={styles.painelMock}>
                <div className={styles.painelMockTopo}>
                  <span>Reservas de hoje</span>
                  <span className={styles.painelMockBadge}>12</span>
                </div>
                <div className={styles.painelMockLinha}>
                  <span className={styles.painelMockAvatar}>A</span>
                  <div className={styles.painelMockTexto}>
                    <b>Ana Cordeiro</b>
                    <span>4 pessoas · 20h</span>
                  </div>
                </div>
                <div className={styles.painelMockLinha}>
                  <span className={styles.painelMockAvatar}>R</span>
                  <div className={styles.painelMockTexto}>
                    <b>Rafael Souza</b>
                    <span>2 pessoas · 20h30</span>
                  </div>
                </div>
                <div className={styles.painelMockLinha}>
                  <span className={styles.painelMockAvatar}>M</span>
                  <div className={styles.painelMockTexto}>
                    <b>Mariana Lopes</b>
                    <span>6 pessoas · 21h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- comparação ---------- */}
        <section className={styles.secao}>
          <span className={styles.eyebrow}>03 · A diferença</span>
          <h2 className={styles.tituloSecao}>Não é um chatbot genérico com um nome diferente</h2>
          <p className={styles.dekSecao}>
            Automação de Instagram pronta responde &quot;qual o horário?&quot; e para por aí. Administrar a
            lotação de um restaurante — almoço e jantar, mesa por mesa, sem deixar passar nem faltar — é outro
            nível de sistema. É esse o nível em que o AutoMesa foi construído:
          </p>
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
                  <td className={styles.rotulo}>Como entende o cliente</td>
                  <td><span className={styles.x}>✕</span> menu de botões fixos — trava se a frase sai do script</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> entende frase corrida: data, período, quantas pessoas e
                    WhatsApp numa mensagem só
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Controle de lotação</td>
                  <td><span className={styles.x}>✕</span> manual, por sua conta — risco real de overbooking</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> automático, separado por almoço e jantar, com folga
                    configurável só quando já está quase no limite
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Link fora do Instagram</td>
                  <td><span className={styles.x}>✕</span> tela genérica da plataforma, sem identidade nenhuma</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> com seu logo e a cor da sua marca extraídos
                    automaticamente — parece um app feito sob medida
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Onde a equipe acompanha</td>
                  <td><span className={styles.x}>✕</span> presa dentro do próprio chat, sem visão do dia inteiro</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> painel próprio, com aviso a cada reserva confirmada e
                    ocupação por período em tempo real
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Acesso da equipe</td>
                  <td><span className={styles.x}>✕</span> tudo ou nada</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> login próprio, restrito só à tela de reservas — sem
                    acesso ao resto do negócio
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Regras do seu jeito</td>
                  <td><span className={styles.x}>✕</span> fixas de fábrica — mudar pede chamado técnico</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> horário de corte, datas bloqueadas e o texto de cada
                    etapa: você mesmo ajusta, na hora
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Fora do assunto reserva</td>
                  <td><span className={styles.x}>✕</span> não entende, ou devolve uma resposta genérica</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> uma IA treinada no tom e no conhecimento da sua casa
                    cuida do resto — cardápio, horário, endereço
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.dekSecao} style={{ marginTop: 28 }}>
            Cada linha dessa tabela é uma decisão que só quem já rodou a reserva de um restaurante de verdade sabe
            que faz diferença. Ferramenta genérica não pensa nelas porque nunca precisou.
          </p>
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
