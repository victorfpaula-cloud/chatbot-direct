import { Fraunces, Outfit } from "next/font/google";
import styles from "./pagina.module.css";
import { DefinicoesDoVidroLiquidoSite } from "./VidroLiquido";
import { EfeitosDeRolagem } from "./EfeitosDeRolagem";
import { ContadorSocial } from "./ContadorSocial";
import { FormularioContato } from "./FormularioContato";

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
            <h1 className={styles.heroTitulo}>Seu Instagram virou uma central de reservas.</h1>
            <p className={styles.heroSub}>
              O cliente manda mensagem no Instagram. O AutoMesa confirma a reserva sozinho.
            </p>
            <div className={styles.heroCtas}>
              <a href={`mailto:${EMAIL_DE_CONTATO}`} className={styles.ctaPrimario}>
                Quero conhecer o AutoMesa
              </a>
              <a href="#como-funciona" className={styles.ctaSecundario}>
                Ver como funciona
              </a>
            </div>
            <p className={styles.heroNota}>Feito sob medida pra restaurante — não é chatbot genérico.</p>
          </div>

          <div className={styles.telefoneWrap}>
            <div className={styles.telefone}>
              <div className={styles.mockNotch} />
              <div className={styles.telefoneTela}>
                <span className={styles.telefoneEyebrow}>Instagram · Direct</span>
                <h2 className={styles.telefoneTitulo}>Seu Restaurante</h2>
                <div className={styles.chatMock}>
                  <div className={`${styles.bolha} ${styles.bolhaCliente}`}>
                    Oi, queria reservar sábado para 4 pessoas às 20h.
                  </div>
                  <div className={`${styles.bolha} ${styles.bolhaBot}`}>
                    Claro! Para sábado às 20h temos disponibilidade. Posso confirmar sua reserva para 4 pessoas?
                  </div>
                  <div className={styles.confirmacaoMock}>
                    <b>Reserva confirmada ✓</b>
                    <span>Sábado · 20h · 4 pessoas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- como funciona (3 passos) ---------- */}
        <section className={`${styles.secao} ${styles.compacta}`} id="como-funciona">
          <span className={styles.eyebrow}>Como funciona</span>
          <h2 className={styles.tituloSecao}>Da mensagem à mesa reservada</h2>
          <div className={styles.passosGrid}>
            <div className={styles.passoGrande}>
              <span className={styles.passoNumero}>01</span>
              <h3>Cliente chama no Instagram</h3>
              <p>&quot;Quero reservar sábado para 4 pessoas.&quot;</p>
            </div>
            <div className={styles.passoGrande}>
              <span className={styles.passoNumero}>02</span>
              <h3>AutoMesa verifica</h3>
              <p>Data, horário e disponibilidade.</p>
            </div>
            <div className={styles.passoGrande}>
              <span className={styles.passoNumero}>03</span>
              <h3>Reserva confirmada</h3>
              <p>Já entra sozinha no painel do restaurante.</p>
            </div>
          </div>
          <p className={styles.passoNota}>
            Funciona também por um <b>link exclusivo</b>.
          </p>
        </section>

        {/* ---------- problema + painel ---------- */}
        <section className={`${styles.secao} ${styles.compacta}`}>
          <div className={styles.operacaoGrid}>
            <div>
              <span className={styles.eyebrow}>Zero trabalho manual</span>
              <h2 className={styles.tituloSecao}>Sua equipe só recebe o cliente</h2>
              <div className={styles.problemasCard}>
                <ul className={styles.problemasLista}>
                  <li className={styles.problemaItem}>
                    <span className={styles.x}>✕</span> Responder cada mensagem
                  </li>
                  <li className={styles.problemaItem}>
                    <span className={styles.x}>✕</span> Conferir disponibilidade
                  </li>
                  <li className={styles.problemaItem}>
                    <span className={styles.x}>✕</span> Contar pessoas
                  </li>
                  <li className={styles.problemaItem}>
                    <span className={styles.x}>✕</span> Evitar overbooking
                  </li>
                </ul>
                <p className={styles.problemasSeta}>Deixa o AutoMesa cuidar disso.</p>
              </div>
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

        {/* ---------- canais (instagram + link) ---------- */}
        <section className={`${styles.secao} ${styles.compacta}`}>
          <span className={styles.eyebrow}>Duas portas, um só controle</span>
          <h2 className={styles.tituloSecao}>Duas formas de reservar. Uma reserva só.</h2>
          <div className={styles.canaisGrid}>
            <div className={styles.canalCard}>
              <h3>Instagram</h3>
              <p>Cliente conversa no Direct, sem instalar nada.</p>
            </div>
            <div className={styles.canaisUniao}>
              <IconeLink />
              <span>mesma reserva</span>
            </div>
            <div className={styles.canalCard}>
              <h3>Link</h3>
              <p>Cliente reserva pelo link, com sua marca.</p>
            </div>
          </div>
        </section>

        {/* ---------- recursos ---------- */}
        <section className={`${styles.secao} ${styles.compacta}`} id="recursos">
          <span className={styles.eyebrow}>Recursos</span>
          <h2 className={styles.tituloSecao}>Tudo que a reserva de um restaurante precisa</h2>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeChat />
              </span>
              <h3>Reservas automáticas</h3>
              <p>Entende data, horário e quantas pessoas numa mensagem só.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeMedidor />
              </span>
              <h3>Controle de lotação</h3>
              <p>Nunca estoura a mesa, por almoço e jantar.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeLink />
              </span>
              <h3>Link personalizado</h3>
              <p>Sua marca, fora do Instagram.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconePainel />
              </span>
              <h3>Painel da equipe</h3>
              <p>Reservas do dia, em tempo real.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeAjustes />
              </span>
              <h3>Regras do seu jeito</h3>
              <p>Horário de corte e datas bloqueadas, você ajusta na hora.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcone}>
                <IconeSparkle />
              </span>
              <h3>IA para dúvidas</h3>
              <p>Cardápio, horário e endereço, resolvidos sozinhos.</p>
            </div>
          </div>
        </section>

        {/* ---------- comparação ---------- */}
        <section className={`${styles.secao} ${styles.compacta}`}>
          <span className={styles.eyebrow}>A diferença</span>
          <h2 className={styles.tituloSecao}>Não é um chatbot genérico</h2>
          <div className={styles.tabelaWrap}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th></th>
                  <th>Chatbot genérico</th>
                  <th className={styles.destaque}>AutoMesa</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.rotulo}>Entende o cliente</td>
                  <td><span className={styles.x}>✕</span> menu de botões fixos</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> frase corrida, direto
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Lotação</td>
                  <td><span className={styles.x}>✕</span> manual, risco de overbooking</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> automática, por período
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Link fora do Instagram</td>
                  <td><span className={styles.x}>✕</span> tela genérica</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> com sua marca
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Painel da equipe</td>
                  <td><span className={styles.x}>✕</span> só dentro do chat</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> próprio, em tempo real
                  </td>
                </tr>
                <tr>
                  <td className={styles.rotulo}>Regras</td>
                  <td><span className={styles.x}>✕</span> fixas de fábrica</td>
                  <td className={styles.destaque}>
                    <span className={styles.check}>✓</span> você ajusta na hora
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <ContadorSocial />

        {/* ---------- cta final ---------- */}
        <section className={styles.ctaFinal}>
          <p className={styles.ctaFinalTitulo}>
            Pare de administrar reservas pelo Direct.
            <br />
            Deixe o AutoMesa fazer isso por você.
          </p>
          <FormularioContato />
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
