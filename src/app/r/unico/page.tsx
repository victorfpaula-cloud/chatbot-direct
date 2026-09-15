"use client";

import { useEffect, useRef, useState } from "react";
import { Fraunces, Outfit } from "next/font/google";
import gsap from "gsap";
import { CenaWebGL } from "./cenaWebGL";
import styles from "./experiencia.module.css";

// Reserva externa (link público, fora do Instagram) — mesma lógica de perguntas do fluxo do
// Direct (ver src/lib/reservas.ts: dia → período → pessoas → whatsapp → confirmação), só que
// clicando em vez de conversando. De propósito, essa primeira versão só cuida do design/experiência
// — as respostas ainda não são gravadas no banco nem na planilha (isso vem depois, uma vez que a
// experiência em si estiver aprovada). Por isso o selo discreto no canto.

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--fonte-display",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-ui",
  display: "swap",
});

type Etapa = "abertura" | "dia" | "dataCustomizada" | "periodo" | "pessoas" | "whatsapp" | "confirmacao";
type Dia = "hoje" | "amanha" | "outro" | null;
type Periodo = "almoco" | "jantar" | null;

const COR_OURO = 0xe8b769;
const COR_LUA = 0x8fb4d9;
const COR_EMBER = 0xc4573a;
const CORES_DIA = [COR_OURO, COR_LUA, COR_EMBER];
const CORES_PERIODO = [COR_OURO, COR_LUA];

export default function ReservaUnicoSushiBar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cenaRef = useRef<CenaWebGL | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const [etapa, setEtapa] = useState<Etapa>("abertura");
  const [dia, setDia] = useState<Dia>(null);
  const [dataEscolhida, setDataEscolhida] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>(null);
  const [pessoas, setPessoas] = useState(2);
  const [whatsapp, setWhatsapp] = useState("");
  const [erroWhatsapp, setErroWhatsapp] = useState(false);
  const [mostrarFim, setMostrarFim] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      cenaRef.current = new CenaWebGL(canvasRef.current);
    } catch (erro) {
      // Sem WebGL (raríssimo, mas existe) a experiência 3D simplesmente não aparece — a navegação
      // entre as perguntas continua funcionando normal, ela não depende do 3D pra nada.
      console.error("Reserva externa: WebGL não iniciou, seguindo sem o fundo animado.", erro);
    }

    function aoMoverPonteiro(e: PointerEvent) {
      cenaRef.current?.atualizarPonteiro((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    }
    window.addEventListener("pointermove", aoMoverPonteiro);

    // título letra a letra, uma vez, na abertura
    if (tituloRef.current) {
      const letras = "Único Sushi Bar".split("").map((c) => {
        const span = document.createElement("span");
        span.textContent = c === " " ? " " : c;
        return span;
      });
      letras.forEach((s) => tituloRef.current!.appendChild(s));
      gsap
        .timeline({ delay: 0.4 })
        .to(`.${styles.marca}`, { opacity: 1, duration: 0.6 })
        .fromTo(letras, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.03, ease: "back.out(1.6)" }, "-=.3");
    }

    return () => {
      window.removeEventListener("pointermove", aoMoverPonteiro);
      cenaRef.current?.destruir();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function piscarFlash() {
    const el = flashRef.current;
    if (!el) return;
    el.classList.add(styles.aceso);
    setTimeout(() => el.classList.remove(styles.aceso), 180);
  }

  async function comecar() {
    await cenaRef.current?.sairDaAberturaParaPortais(CORES_DIA);
    setEtapa("dia");
  }

  async function escolherDia(indice: number, valor: Exclude<Dia, null>) {
    setDia(valor);
    if (valor === "outro") {
      cenaRef.current?.destacarPortal(indice, true);
      setEtapa("dataCustomizada");
      return;
    }
    await cenaRef.current?.retrairPortais(indice);
    piscarFlash();
    setEtapa("periodo");
    cenaRef.current?.revelarPortais(CORES_PERIODO);
  }

  async function confirmarDataCustomizada() {
    await cenaRef.current?.retrairPortais(2);
    piscarFlash();
    setEtapa("periodo");
    cenaRef.current?.revelarPortais(CORES_PERIODO);
  }

  async function escolherPeriodo(indice: number, valor: Exclude<Periodo, null>) {
    setPeriodo(valor);
    await cenaRef.current?.retrairPortais(indice);
    piscarFlash();
    setEtapa("pessoas");
    cenaRef.current?.revelarConstelacao().then(() => cenaRef.current?.revelarPessoas(pessoas));
  }

  function ajustarPessoas(delta: number) {
    setPessoas((atual) => {
      const novo = Math.min(10, Math.max(1, atual + delta));
      cenaRef.current?.revelarPessoas(novo);
      return novo;
    });
  }

  function continuarParaWhatsapp() {
    piscarFlash();
    setEtapa("whatsapp");
    cenaRef.current?.avancarParaSereno();
  }

  function continuarParaConfirmacao() {
    const digitos = whatsapp.replace(/\D/g, "");
    if (digitos.length < 8) {
      setErroWhatsapp(true);
      return;
    }
    setErroWhatsapp(false);
    piscarFlash();
    setEtapa("confirmacao");
  }

  async function confirmarReserva() {
    await cenaRef.current?.avancarParaFinal();
    setMostrarFim(true);
  }

  const rotuloDia = dia === "hoje" ? "Hoje" : dia === "amanha" ? "Amanhã" : dataEscolhida || "Outro dia";
  const rotuloPeriodo = periodo === "almoco" ? "Almoço" : periodo === "jantar" ? "Jantar" : "";

  return (
    <div className={`${styles.pagina} ${fraunces.variable} ${outfit.variable}`}>
      <span className={styles.rotuloPrevia}>
        Prévia — <b>Único Sushi Bar</b>
      </span>
      <canvas ref={canvasRef} className={styles.telaWebgl} />
      <div className={styles.vinheta} />
      <div ref={flashRef} className={styles.flash} />

      <div className={styles.palco}>
        {etapa === "abertura" && (
          <div className={styles.telaInterna}>
            <span className={styles.marca}>Reserva</span>
            <h1 ref={tituloRef} className={styles.titulo} />
            <p className={styles.subtitulo}>uma jornada até a sua mesa</p>
            <button className={styles.cta} onClick={comecar}>
              Toque para começar
            </button>
          </div>
        )}

        {etapa === "dia" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 1 de 5</span>
            <h2 className={styles.perguntaTitulo}>Para quando é a sua reserva?</h2>
            <div className={styles.opcoes}>
              <button
                className={styles.opcao}
                onPointerEnter={() => cenaRef.current?.destacarPortal(0, true)}
                onPointerLeave={() => cenaRef.current?.destacarPortal(0, false)}
                onClick={() => escolherDia(0, "hoje")}
              >
                <span className={styles.opcaoTexto}>Hoje</span>
              </button>
              <button
                className={styles.opcao}
                onPointerEnter={() => cenaRef.current?.destacarPortal(1, true)}
                onPointerLeave={() => cenaRef.current?.destacarPortal(1, false)}
                onClick={() => escolherDia(1, "amanha")}
              >
                <span className={styles.opcaoTexto}>Amanhã</span>
              </button>
              <button
                className={styles.opcao}
                onPointerEnter={() => cenaRef.current?.destacarPortal(2, true)}
                onPointerLeave={() => cenaRef.current?.destacarPortal(2, false)}
                onClick={() => escolherDia(2, "outro")}
              >
                <span className={styles.opcaoTexto}>Outro dia</span>
              </button>
            </div>
          </div>
        )}

        {etapa === "dataCustomizada" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 1 de 5</span>
            <h2 className={styles.perguntaTitulo}>Pra qual dia?</h2>
            <input
              id="campo-data"
              type="date"
              className={styles.campo}
              value={dataEscolhida}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataEscolhida(e.target.value)}
            />
            <button className={styles.botaoPrincipal} disabled={!dataEscolhida} onClick={confirmarDataCustomizada}>
              Continuar
            </button>
          </div>
        )}

        {etapa === "periodo" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 2 de 5</span>
            <h2 className={styles.perguntaTitulo}>É pro almoço ou jantar?</h2>
            <div className={styles.opcoes}>
              <button
                className={styles.opcao}
                onPointerEnter={() => cenaRef.current?.destacarPortal(0, true)}
                onPointerLeave={() => cenaRef.current?.destacarPortal(0, false)}
                onClick={() => escolherPeriodo(0, "almoco")}
              >
                <span className={styles.opcaoTexto}>Almoço</span>
              </button>
              <button
                className={styles.opcao}
                onPointerEnter={() => cenaRef.current?.destacarPortal(1, true)}
                onPointerLeave={() => cenaRef.current?.destacarPortal(1, false)}
                onClick={() => escolherPeriodo(1, "jantar")}
              >
                <span className={styles.opcaoTexto}>Jantar</span>
              </button>
            </div>
          </div>
        )}

        {etapa === "pessoas" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 3 de 5</span>
            <h2 className={styles.perguntaTitulo}>Quantas pessoas vão à mesa?</h2>
            <div className={styles.contador}>
              <button className={styles.contadorBotao} onClick={() => ajustarPessoas(-1)} aria-label="Diminuir">
                –
              </button>
              <span className={styles.contadorNumero}>{pessoas}</span>
              <button className={styles.contadorBotao} onClick={() => ajustarPessoas(1)} aria-label="Aumentar">
                +
              </button>
            </div>
            <span className={styles.contadorLegenda}>cada pessoa acende uma luz na constelação</span>
            <button className={styles.botaoPrincipal} onClick={continuarParaWhatsapp}>
              Continuar
            </button>
          </div>
        )}

        {etapa === "whatsapp" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 4 de 5</span>
            <h2 className={styles.perguntaTitulo}>Qual o melhor WhatsApp pra confirmar?</h2>
            <input
              id="campo-whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className={styles.campo}
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                setErroWhatsapp(false);
              }}
            />
            {erroWhatsapp && <span style={{ color: "#f0a0a0", fontSize: 12.5, marginTop: 8 }}>Confere o número com DDD, por favor.</span>}
            <button className={styles.botaoPrincipal} onClick={continuarParaConfirmacao}>
              Continuar
            </button>
          </div>
        )}

        {etapa === "confirmacao" && (
          <div className={styles.telaInterna}>
            <span className={styles.eyebrow}>Etapa 5 de 5</span>
            <h2 className={styles.perguntaTitulo}>Revise sua reserva</h2>
            <div className={styles.resumo}>
              <div className={styles.resumoLinha}>
                <span>Dia</span>
                <span>{rotuloDia}</span>
              </div>
              <div className={styles.resumoLinha}>
                <span>Período</span>
                <span>{rotuloPeriodo}</span>
              </div>
              <div className={styles.resumoLinha}>
                <span>Pessoas</span>
                <span>{pessoas}</span>
              </div>
              <div className={styles.resumoLinha}>
                <span>WhatsApp</span>
                <span>{whatsapp}</span>
              </div>
            </div>
            <button className={styles.botaoPrincipal} onClick={confirmarReserva}>
              Confirmar reserva
            </button>
          </div>
        )}
      </div>

      {mostrarFim && (
        <div className={styles.fimOverlay}>
          <div className={styles.fimCaixa}>
            <b>Reserva confirmada!</b>
            <p>Te esperamos por lá. Qualquer mudança, é só chamar por aqui de novo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
