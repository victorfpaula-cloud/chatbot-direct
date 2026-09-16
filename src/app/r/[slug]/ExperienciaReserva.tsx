"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./experiencia.module.css";
import type { ConfigPublica } from "@/lib/reservaExterna";
import { DefinicoesDoVidroLiquidoExterno } from "./VidroLiquido";

// Reserva externa (link público /r/[slug], fora do Instagram) — mesma lógica de perguntas e as
// MESMAS regras de horário/capacidade do fluxo do Direct (ver src/lib/reservas.ts e
// src/lib/reservaExterna.ts: a config vem sempre lida ao vivo de chatbot_account_settings, nunca
// copiada, então uma mudança feita no painel vale automaticamente aqui também).
//
// De propósito imperativo (refs + manipulação direta do DOM dentro de um único useEffect, no
// lugar de várias peças de estado do React) em vez de idiomático: essa tela inteira — cores,
// timings, sequência de cada animação — já passou por 10 rodadas de aprovação do cliente como um
// protótipo HTML solto, e portar 1:1 preserva exatamente o comportamento já validado, com o mínimo
// de chance de reintroduzir uma regressão visual sutil numa reescrita "à moda React".

type Etapa = "abertura" | "dia" | "periodo" | "pessoas" | "whatsapp" | "confirmacao" | "fim";

export function ExperienciaReserva({ slug, config }: { slug: string; config: ConfigPublica }) {
  const raizRef = useRef<HTMLDivElement>(null);
  // Link de foto da Meta pode ter vencido entre a hora que a página buscou e a hora que o
  // navegador tenta carregar — igual já tratamos em AvatarConta.tsx, esconde em vez de mostrar
  // ícone de imagem quebrada.
  const [logoFalhou, setLogoFalhou] = useState(false);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;

    const q = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel);
    const qa = <T extends Element = HTMLElement>(sel: string) => Array.from(raiz.querySelectorAll<T>(sel));

    const dados = {
      nome: "",
      dataEscolhida: "",
      periodo: null as "almoco" | "jantar" | null,
      pessoas: 2,
      whatsapp: "",
    };

    const cenas: Record<string, HTMLElement> = {};
    qa(`.${styles.cena}`).forEach((el) => {
      const nome = el.getAttribute("data-cena");
      if (nome) cenas[nome] = el;
    });
    let historico: string[] = [];

    const pontosEl = q(`.${styles.pontos}`)!;
    (["dia", "periodo", "pessoas", "whatsapp", "confirmacao"] as const).forEach((_, i) => {
      const p = document.createElement("div");
      p.className = styles.ponto;
      p.dataset.i = String(i);
      pontosEl.appendChild(p);
    });

    const btnVoltar = q(`.${styles.voltar}`) as HTMLButtonElement;
    const barra = q(`.${styles.progressoBarra}`) as HTMLElement;

    function atualizarProgresso(nome: string) {
      const passos = ["abertura", "dia", "periodo", "pessoas", "whatsapp", "confirmacao", "fim"];
      const i = passos.indexOf(nome);
      barra.style.width = (i / (passos.length - 1)) * 100 + "%";
      qa(`.${styles.ponto}`).forEach((p) => {
        const pi = Number((p as HTMLElement).dataset.i);
        p.classList.toggle(styles.feito, pi < i - 1);
        p.classList.toggle(styles.atual, pi === i - 1);
      });
      btnVoltar.classList.toggle(styles.visivel, historico.length > 0 && nome !== "fim");
    }

    // Entrada e saída fazem par: a cena some se desfazendo num leve desfoque (blur) antes de subir
    // e desaparecer, e a próxima nasce do mesmo jeito, ao contrário — desfocada, encolhida e um
    // pouco abaixo, materializando nítida no lugar. Cross-dissolve borrado, não só um fade simples.
    function animarEntrada(cenaEl: HTMLElement) {
      const elementos = cenaEl.querySelectorAll(`.${styles.elem}`);
      gsap.fromTo(
        elementos,
        { opacity: 0, y: 26, scale: 0.96, filter: "blur(5px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.55,
          stagger: 0.07,
          ease: "back.out(1.5)",
          clearProps: "transform,filter",
        }
      );
    }

    /** Cada elemento da cena atual se desfaz (desfoca + encolhe + sobe) com um leve escalonamento
     * entre um e outro, em vez de só o cartão inteiro deslizando pra fora — some em pedaços, não em
     * bloco só. Roda em paralelo ao slide do `.cenaInterna` já existente em `trocar()`. */
    function animarSaida(cenaEl: HTMLElement) {
      const elementos = cenaEl.querySelectorAll(`.${styles.elem}`);
      return gsap.to(elementos, {
        opacity: 0,
        y: -14,
        scale: 0.92,
        filter: "blur(6px)",
        duration: 0.26,
        stagger: 0.03,
        ease: "power2.in",
      });
    }

    function animarIconeHero(cenaEl: HTMLElement) {
      const svg = cenaEl.querySelector(`.${styles.iconeHero} svg`);
      if (!svg) return;
      svg.querySelectorAll<SVGPathElement | SVGCircleElement>(".tracoDesenha").forEach((traco, i) => {
        const comprimento = (traco as unknown as SVGGeometryElement).getTotalLength();
        gsap.set(traco, { strokeDasharray: comprimento, strokeDashoffset: comprimento });
        gsap.to(traco, { strokeDashoffset: 0, duration: 0.6, delay: 0.1 + i * 0.15, ease: "power2.out" });
      });
      const ponteiro = svg.querySelector(".ponteiro");
      if (ponteiro) {
        gsap.fromTo(
          ponteiro,
          { rotation: -95, transformOrigin: "12px 12px" },
          { rotation: 0, duration: 0.5, delay: 0.5, ease: "back.out(2.2)" }
        );
      }
    }

    function pulsarBrilhos() {
      gsap.fromTo(`.${styles.brilhoOrbe}`, { scale: 1 }, { scale: 1.18, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut", stagger: 0.06 });
    }

    function trocar(nome: string, indo?: "voltar") {
      const atual = q(`.${styles.cena}.${styles.ativa}`)!;
      const nomeAtual = atual.dataset.cena!;
      if (indo !== "voltar") historico.push(nomeAtual);
      else historico.pop();

      const proxima = cenas[nome];
      const direcao = indo === "voltar" ? 1 : -1;
      const tl = gsap.timeline();
      tl.add(animarSaida(atual), 0)
        .to(
          atual.querySelector(`.${styles.cenaInterna}`),
          { opacity: 0, x: 40 * direcao, scale: 0.94, duration: 0.3, ease: "power2.in" },
          0
        )
        .call(() => {
          atual.classList.remove(styles.ativa);
          proxima.classList.add(styles.ativa);
          atualizarProgresso(nome);
          gsap.set(proxima.querySelector(`.${styles.cenaInterna}`), { x: 0, scale: 1, opacity: 1 });
          animarEntrada(proxima);
          animarIconeHero(proxima);
          pulsarBrilhos();
        });
    }

    function restaurarEstado(nome: string) {
      if (nome === "dia") montarCalendario();
      if (nome === "periodo") {
        qa(`[data-cena="periodo"] .${styles.opcao}`).forEach((o) => o.classList.toggle(styles.escolhida, o.dataset.valor === dados.periodo));
      }
      if (nome === "pessoas") montarCadeiras();
      if (nome === "whatsapp") (campoWhats as HTMLInputElement).value = dados.whatsapp;
    }

    function voltar() {
      if (!historico.length) return;
      const alvo = historico[historico.length - 1];
      trocar(alvo, "voltar");
      setTimeout(() => restaurarEstado(alvo), 50);
    }
    btnVoltar.addEventListener("click", voltar);

    // Vibração bem curta nos momentos de "escolha" (não em todo clique) — Android/Chrome vibra de
    // verdade, iOS/Safari simplesmente não tem `navigator.vibrate` (nunca implementou), então isso
    // vira um no-op silencioso lá, sem precisar de nenhum tratamento especial pra esse caso.
    function vibrar(padrao: number | number[]) {
      try {
        navigator.vibrate?.(padrao);
      } catch {
        // Alguns navegadores lançam se chamado fora de um gesto do usuário — seguro ignorar.
      }
    }

    function ondularBotao(botao: HTMLElement, e?: { clientX: number; clientY: number }) {
      const r = botao.getBoundingClientRect();
      const onda = document.createElement("span");
      onda.className = styles.ondulacao;
      const tam = Math.max(r.width, r.height) * 1.6;
      onda.style.width = onda.style.height = tam + "px";
      onda.style.left = (e?.clientX ?? r.left + r.width / 2) - r.left - tam / 2 + "px";
      onda.style.top = (e?.clientY ?? r.top + r.height / 2) - r.top - tam / 2 + "px";
      botao.appendChild(onda);
      gsap.fromTo(onda, { scale: 0, opacity: 0.55 }, { scale: 1, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => onda.remove() });
      gsap.fromTo(botao, { scale: 0.95 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)" });
    }

    function celebrarEscolha(botao: HTMLElement) {
      const tecla = botao.querySelector(`.${styles.tecla}`);
      const check = botao.querySelector(`.${styles.check}`);
      gsap.fromTo(tecla, { scale: 1, rotation: 0 }, { scale: 1.22, rotation: -8, duration: 0.22, ease: "power2.out", yoyo: true, repeat: 1 });
      gsap.fromTo(check, { scale: 0, rotation: -45 }, { scale: 1, rotation: 0, duration: 0.5, delay: 0.08, ease: "back.out(3.4)" });
    }

    // ---------- campo nome / abertura ----------
    const campoNome = q<HTMLInputElement>("#campo-nome")!;
    const btnComecar = q<HTMLButtonElement>("#btn-comecar")!;
    btnComecar.addEventListener("click", () => {
      const nome = campoNome.value.trim();
      if (nome.length < 2) {
        gsap.fromTo(campoNome, { x: -8 }, { x: 0, duration: 0.45, ease: "elastic.out(1,.35)" });
        campoNome.focus();
        return;
      }
      dados.nome = nome;
      trocar("dia");
    });

    // ---------- calendário ----------
    const nomesMes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    function chaveISO(d: Date) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    const hojeISOStr = chaveISO(new Date());
    dados.dataEscolhida = hojeISOStr;
    const calCursor = new Date();
    calCursor.setDate(1);

    const calMesAno = q("#cal-mes-ano")!;
    const calGrade = q("#cal-grade")!;
    const calAnterior = q<HTMLButtonElement>("#cal-anterior")!;
    const calProximo = q<HTMLButtonElement>("#cal-proximo")!;

    function montarCalendario() {
      const ano = calCursor.getFullYear();
      const mes = calCursor.getMonth();
      const nomeMes = nomesMes[mes];
      calMesAno.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + " de " + ano;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
      const totalDias = new Date(ano, mes + 1, 0).getDate();

      calGrade.innerHTML = "";
      for (let i = 0; i < primeiroDiaSemana; i++) {
        const vazio = document.createElement("span");
        vazio.className = `${styles.calDia} ${styles.fora}`;
        calGrade.appendChild(vazio);
      }
      for (let dia = 1; dia <= totalDias; dia++) {
        const dataCel = new Date(ano, mes, dia);
        const iso = chaveISO(dataCel);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = styles.calDia;
        btn.textContent = String(dia);
        const ehHoje = iso === hojeISOStr;
        const bloqueadoPorData = config.datasBloqueadas.includes(iso);
        const bloqueadoPorHorario = ehHoje && config.hojeFechadoPorHorario;
        if (dataCel < hoje) btn.classList.add(styles.passado);
        else if (bloqueadoPorData || bloqueadoPorHorario) btn.classList.add(styles.bloqueado);
        if (ehHoje) btn.classList.add(styles.hoje);
        if (iso === dados.dataEscolhida) btn.classList.add(styles.selecionado);
        btn.addEventListener("click", (e) => escolherDataCalendario(iso, btn, e));
        calGrade.appendChild(btn);
      }
      calAnterior.disabled = ano === hoje.getFullYear() && mes === hoje.getMonth();
    }

    function escolherDataCalendario(iso: string, botao: HTMLElement, evento: MouseEvent) {
      dados.dataEscolhida = iso;
      qa(`.${styles.calDia}.${styles.selecionado}`).forEach((b) => b.classList.remove(styles.selecionado));
      botao.classList.add(styles.selecionado);
      gsap.fromTo(botao, { scale: 1 }, { scale: 1.18, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" });
      vibrar(8);
      void evento;
    }

    calAnterior.addEventListener("click", () => {
      calCursor.setMonth(calCursor.getMonth() - 1);
      montarCalendario();
    });
    calProximo.addEventListener("click", () => {
      calCursor.setMonth(calCursor.getMonth() + 1);
      montarCalendario();
    });
    montarCalendario();

    // Depois desse horário, só faz sentido perguntar "almoço ou jantar?" se o dia escolhido NÃO for
    // hoje (reservar pra amanhã de manhã continua podendo ser almoço) — passado esse horário HOJE,
    // só sobra jantar mesmo, então a pergunta some da conversa e a gente já assume jantar sozinho,
    // sem precisar incomodar o cliente com uma escolha que já não é escolha nenhuma.
    const HORA_LIMITE_ALMOCO = 13;
    function soSobrouJantar(dataISO: string): boolean {
      return dataISO === hojeISOStr && new Date().getHours() >= HORA_LIMITE_ALMOCO;
    }

    const btnDiaContinuar = q<HTMLButtonElement>("#btn-dia-continuar")!;
    btnDiaContinuar.addEventListener("click", (e) => {
      ondularBotao(btnDiaContinuar, e);
      if (soSobrouJantar(dados.dataEscolhida)) {
        dados.periodo = "jantar";
        setTimeout(() => {
          montarCadeiras();
          trocar("pessoas");
        }, 180);
      } else {
        setTimeout(() => trocar("periodo"), 180);
      }
    });

    function formatarDataResumo(iso: string) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const [y, m, d] = iso.split("-").map(Number);
      const alvo = new Date(y, m - 1, d);
      if (chaveISO(alvo) === chaveISO(hoje)) return "Hoje";
      if (chaveISO(alvo) === chaveISO(amanha)) return "Amanhã";
      return d + " de " + nomesMes[m - 1];
    }

    // ---------- período ----------
    function escolherPeriodo(botao: HTMLElement, valor: "almoco" | "jantar", evento: MouseEvent) {
      qa(`[data-cena="periodo"] .${styles.opcao}`).forEach((o) => o.classList.remove(styles.escolhida));
      botao.classList.add(styles.escolhida);
      ondularBotao(botao, evento);
      celebrarEscolha(botao);
      vibrar(12);
      dados.periodo = valor;
      setTimeout(() => {
        montarCadeiras();
        trocar("pessoas");
      }, 320);
    }
    qa(`[data-cena="periodo"] .${styles.opcao}`).forEach((botao) => {
      const valor = botao.dataset.valor as "almoco" | "jantar";
      botao.addEventListener("click", (e) => escolherPeriodo(botao, valor, e));
    });

    // ---------- pessoas ----------
    const cadeirasEl = q("#cadeiras")!;
    function montarCadeiras() {
      cadeirasEl.innerHTML = "";
      for (let i = 0; i < 20; i++) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", i < dados.pessoas ? `${styles.cadeira} ${styles.acesa}` : styles.cadeira);
        svg.innerHTML = '<use href="#icone-cadeira"/>';
        cadeirasEl.appendChild(svg);
      }
    }
    const numeroPessoasEl = q("#numero-pessoas")!;
    function ajustarPessoas(delta: number) {
      dados.pessoas = Math.min(20, Math.max(1, dados.pessoas + delta));
      numeroPessoasEl.textContent = String(dados.pessoas);
      gsap.fromTo(numeroPessoasEl, { scale: 1.35, rotation: -6 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.4)" });
      vibrar(6);
      montarCadeiras();
      const nova = cadeirasEl.children[dados.pessoas - 1];
      if (nova) gsap.fromTo(nova, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.8)" });
    }
    q<HTMLButtonElement>("#btn-pessoas-menos")!.addEventListener("click", () => ajustarPessoas(-1));
    q<HTMLButtonElement>("#btn-pessoas-mais")!.addEventListener("click", () => ajustarPessoas(1));

    const btnPessoasContinuar = q<HTMLButtonElement>("#btn-pessoas-continuar")!;
    const dicaPessoas = q("#dica-pessoas")!;
    btnPessoasContinuar.addEventListener("click", async (e) => {
      ondularBotao(btnPessoasContinuar, e);
      dicaPessoas.textContent = "";
      btnPessoasContinuar.disabled = true;
      try {
        const resposta = await fetch(`/api/r/${slug}/disponibilidade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dados.dataEscolhida, periodo: dados.periodo, pessoas: dados.pessoas }),
        });
        const resultado = await resposta.json();
        if (!resultado.permitido) {
          dicaPessoas.textContent = resultado.mensagem || "Não conseguimos confirmar essa quantidade — tenta um número menor.";
          dicaPessoas.classList.add(styles.dicaErro);
          return;
        }
        setTimeout(() => trocar("whatsapp"), 180);
      } catch {
        dicaPessoas.textContent = "Deu um probleminha de conexão — tenta de novo.";
        dicaPessoas.classList.add(styles.dicaErro);
      } finally {
        btnPessoasContinuar.disabled = false;
      }
    });

    // ---------- whatsapp ----------
    const campoWhats = q<HTMLInputElement>("#campo-whatsapp")!;
    const dicaWhats = q("#dica-whatsapp")!;
    function validarWhats() {
      const digitos = campoWhats.value.replace(/\D/g, "");
      if (digitos.length < 8) {
        gsap.fromTo(campoWhats, { x: -8 }, { x: 0, duration: 0.45, ease: "elastic.out(1,.35)" });
        dicaWhats.classList.add(styles.dicaErro);
        return false;
      }
      dados.whatsapp = campoWhats.value;
      return true;
    }
    const btnWhatsappContinuar = q<HTMLButtonElement>("#btn-whatsapp-continuar")!;
    btnWhatsappContinuar.addEventListener("click", (e) => {
      if (!validarWhats()) return;
      ondularBotao(btnWhatsappContinuar, e);
      q("#resumo-dia")!.textContent = formatarDataResumo(dados.dataEscolhida);
      q("#resumo-periodo")!.textContent = dados.periodo === "almoco" ? "Almoço" : "Jantar";
      q("#resumo-pessoas")!.textContent = String(dados.pessoas);
      q("#resumo-whatsapp")!.textContent = dados.whatsapp;
      // Toque pessoal no título dessa última pergunta — só o primeiro nome, pra não ficar formal
      // demais ("Tudo certo, Maria Eduarda da Silva?" soaria estranho lido em voz alta).
      const primeiroNome = dados.nome.split(" ")[0];
      q("#titulo-confirmacao")!.textContent = primeiroNome ? `Tudo certo, ${primeiroNome}?` : "Tudo certo?";
      setTimeout(() => trocar("confirmacao"), 180);
    });

    // ---------- confirmação ----------
    function estourarConfete() {
      const cores = ["#818cf8", "#a5b4fc", "#4f46e5", "#f2f2f7"];
      for (let i = 0; i < 32; i++) {
        const c = document.createElement("div");
        c.className = styles.confete;
        const tam = 5 + Math.random() * 6;
        c.style.width = tam + "px";
        c.style.height = tam + "px";
        c.style.background = cores[i % cores.length];
        c.style.borderRadius = Math.random() > 0.5 ? "999px" : "3px";
        c.style.left = "50%";
        c.style.top = "38%";
        document.body.appendChild(c);
        const ang = Math.random() * Math.PI * 2;
        const dist = 130 + Math.random() * 200;
        gsap.to(c, {
          x: Math.cos(ang) * dist,
          y: Math.sin(ang) * dist - 70,
          rotation: Math.random() * 360,
          opacity: 0,
          duration: 1 + Math.random() * 0.6,
          ease: "power2.out",
          onComplete: () => c.remove(),
        });
      }
    }

    // Horário só aproximado (não temos um horário exato reservado, só o período) — serve pra dar
    // um bloco plausível de ~1h30 no calendário de quem for, não uma hora cravada que o
    // restaurante nunca prometeu.
    function horarioAproximadoDoPeriodo(periodo: "almoco" | "jantar" | null): { inicio: string; fim: string } {
      return periodo === "almoco" ? { inicio: "1200", fim: "1330" } : { inicio: "2000", fim: "2130" };
    }
    function linkAdicionarNaAgenda(): string {
      const { inicio, fim } = horarioAproximadoDoPeriodo(dados.periodo);
      const dataCompacta = dados.dataEscolhida.replace(/-/g, "");
      const titulo = encodeURIComponent(`Reserva — ${config.nomeConta}`);
      const detalhes = encodeURIComponent(`Mesa reservada para ${dados.pessoas} pessoa(s) em ${config.nomeConta}.`);
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataCompacta}T${inicio}00/${dataCompacta}T${fim}00&details=${detalhes}`;
    }

    const btnConfirmar = q<HTMLButtonElement>("#btn-confirmar")!;
    const dicaConfirmacao = q("#dica-confirmacao")!;
    const fimTexto = q("#fim-texto")!;
    const linkAgenda = q<HTMLAnchorElement>("#link-agenda")!;
    btnConfirmar.addEventListener("click", async (e) => {
      ondularBotao(btnConfirmar, e);
      dicaConfirmacao.textContent = "";
      btnConfirmar.disabled = true;
      try {
        const resposta = await fetch(`/api/r/${slug}/reservar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: dados.nome,
            whatsapp: dados.whatsapp,
            data: dados.dataEscolhida,
            periodo: dados.periodo,
            pessoas: dados.pessoas,
          }),
        });
        const resultado = await resposta.json();
        if (!resultado.ok) {
          dicaConfirmacao.textContent = resultado.mensagem || "Não deu pra confirmar — tenta de novo em instantes.";
          dicaConfirmacao.classList.add(styles.dicaErro);
          return;
        }
        fimTexto.textContent = resultado.mensagem;
        linkAgenda.href = linkAdicionarNaAgenda();
        vibrar([15, 40, 15]);
        setTimeout(() => {
          trocar("fim");
          setTimeout(() => {
            estourarConfete();
            gsap.to("#check-path", { strokeDashoffset: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
          }, 400);
        }, 180);
      } catch {
        dicaConfirmacao.textContent = "Deu um probleminha de conexão — tenta de novo.";
        dicaConfirmacao.classList.add(styles.dicaErro);
      } finally {
        btnConfirmar.disabled = false;
      }
    });

    // ---------- atalhos de teclado (desktop) ----------
    function aoTeclarNavegacao(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace") {
        const foco = document.activeElement;
        const emCampo = foco && foco.tagName === "INPUT";
        if (!emCampo || e.key === "Escape") {
          e.preventDefault();
          voltar();
        }
        return;
      }
      if (e.key !== "Enter") return;
      const atual = q(`.${styles.cena}.${styles.ativa}`)!.dataset.cena as Etapa;
      if (atual === "abertura") btnComecar.click();
      if (atual === "dia") btnDiaContinuar.click();
      if (atual === "pessoas") btnPessoasContinuar.click();
      if (atual === "whatsapp") btnWhatsappContinuar.click();
      if (atual === "confirmacao") btnConfirmar.click();
    }
    document.addEventListener("keydown", aoTeclarNavegacao);

    // ---------- brilhos do fundo: luz índigo à deriva, sozinha, reagindo ao ponteiro ----------
    // No celular (tela estreita, pouco espaço pros lados) a deriva vai de CIMA pra BAIXO — no
    // desktop/tablet (tela larga) continua da DIREITA pra ESQUERDA. Em ambos os casos, simétrica em
    // volta da posição do CSS (começa deslocada numa ponta, termina na outra), não só indo cada vez
    // mais pra um lado só — a posição base de .o1/.o2/.o3 já nasce puxada pra canto (ver
    // left/right/bottom no CSS), então um vaivém relativo A PARTIR dali nunca cruzava o centro.
    //
    // Alcance em PORCENTAGEM da tela (não pixel fixo) de propósito — um número fixo de pixels que
    // parecia razoável num celular ficava insignificante numa tela bem maior (ex.: iPad deitado, ou
    // desktop): o brilho continuava "preso" do mesmo lado só porque o deslocamento era pequeno
    // demais perto do tamanho real da tela. Em % do próprio eixo (altura no celular, largura no
    // desktop/tablet), o cruzamento de ponta a ponta sempre acontece, não importa o tamanho da tela.
    const ehTelaEstreita = window.matchMedia("(max-width: 640px)").matches;
    function derivaAutonoma(sel: string, dur: number, percentual: number) {
      if (ehTelaEstreita) {
        const alcance = window.innerHeight * (percentual / 100);
        gsap.fromTo(
          sel,
          { y: `-=${alcance / 2}` },
          { y: `+=${alcance}`, x: `+=${alcance * 0.08}`, duration: dur, yoyo: true, repeat: -1, ease: "sine.inOut" }
        );
      } else {
        const alcance = window.innerWidth * (percentual / 100);
        gsap.fromTo(
          sel,
          { x: `+=${alcance / 2}` },
          { x: `-=${alcance}`, y: `+=${alcance * 0.08}`, duration: dur, yoyo: true, repeat: -1, ease: "sine.inOut" }
        );
      }
    }
    function respirar(sel: string, dur: number, ate: number) {
      gsap.to(sel, { scale: ate, opacity: "*=1.15", duration: dur, yoyo: true, repeat: -1, ease: "sine.inOut", delay: Math.random() * dur });
    }

    // ---------- deriva de cor: gira o matiz até pousar sempre na família vermelho->laranja ----------
    // hue-rotate desloca a partir da cor de ORIGEM de cada brilho, que muda por conta (extraída do
    // logo do restaurante, ver corDoLogo.ts) — um grau fixo (ex.: sempre "+22deg") passeia por tons
    // completamente diferentes dependendo de onde a cor começa. Em vez de chutar um grau fixo, mede
    // o matiz de verdade (convertendo a cor computada pra HSL) e calcula a rotação exata pra
    // pousar num matiz-ALVO absoluto — assim sempre fica entre vermelho e laranja (nunca escorrega
    // pro amarelo), não importa a cor de origem daquela conta.
    function matizDaCor(corCss: string): number | null {
      const el = document.createElement("div");
      el.style.color = corCss;
      raiz!.appendChild(el);
      const rgb = getComputedStyle(el).color;
      raiz!.removeChild(el);
      const m = rgb.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (!m) return null;
      const r = parseInt(m[1], 10) / 255;
      const g = parseInt(m[2], 10) / 255;
      const b = parseInt(m[3], 10) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
      return h < 0 ? h + 360 : h;
    }
    // Menor caminho até o matiz-alvo (nunca mais que meia volta, pra sempre ser a rotação mais curta).
    function rotacaoAte(origemGraus: number, alvoGraus: number): number {
      let diff = (alvoGraus - origemGraus) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return diff;
    }
    // Vai e volta entre DOIS matizes-alvo (não de "0" até um alvo) — se a cor de origem daquela
    // conta já calhar de nascer perto de um alvo só, a rotação até ele fica pequena demais e o
    // giro quase não aparece. Com dois alvos sempre uns 35-40° separados um do outro (dentro da
    // mesma faixa vermelho->laranja), a variação visível nunca desaparece, não importa de onde a
    // cor de origem começa.
    function derivaDeCor(sel: string, dur: number, corBaseCss: string, matizA: number, matizB: number) {
      const origem = matizDaCor(corBaseCss);
      if (origem === null) return;
      const grausA = rotacaoAte(origem, matizA);
      const grausB = rotacaoAte(origem, matizB);
      gsap.fromTo(
        sel,
        { filter: `blur(4vmax) hue-rotate(${grausA}deg)` },
        { filter: `blur(4vmax) hue-rotate(${grausB}deg)`, duration: dur, yoyo: true, repeat: -1, ease: "sine.inOut" }
      );
    }

    let aoMoverPonteiro: ((e: PointerEvent) => void) | null = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Mais rápido e mais fluido ainda que a rodada anterior — o segundo parâmetro agora é
      // PORCENTAGEM da tela (altura no celular, largura no desktop/tablet), não pixel fixo.
      derivaAutonoma(`.${styles.o1}`, 6, 70);
      derivaAutonoma(`.${styles.o2}`, 7.5, 58);
      derivaAutonoma(`.${styles.o3}`, 5, 80);
      respirar(`.${styles.o1}`, 8, 1.12);
      respirar(`.${styles.o2}`, 10, 1.16);
      respirar(`.${styles.o3}`, 6.5, 1.2);

      // Cor de origem de cada brilho: lê a variável de verdade (pode vir sobrescrita por conta, ver
      // corDoLogo.ts) e cai pro mesmo valor padrão do CSS quando não há paleta customizada.
      const estiloRaiz = getComputedStyle(raiz);
      const corGlow1 = estiloRaiz.getPropertyValue("--glow-1").trim() || "rgba(99, 102, 241, 0.5)";
      const corGlow2 = estiloRaiz.getPropertyValue("--glow-2").trim() || "rgba(129, 140, 248, 0.4)";
      const corGlow3 = estiloRaiz.getPropertyValue("--glow-3").trim() || "rgba(199, 207, 251, 0.32)";
      // Cada brilho vai e volta entre dois matizes dentro da MESMA família vermelho->laranja
      // (0°-30°, nunca chegando nos ~50-60° onde já é amarelo) — a distância entre os dois alvos é
      // sempre uns 35° não importa a cor de origem daquela conta, então a variação sempre aparece.
      derivaDeCor(`.${styles.o1}`, 10, corGlow1, 355, 30);
      derivaDeCor(`.${styles.o2}`, 13, corGlow2, 350, 25);
      derivaDeCor(`.${styles.o3}`, 8, corGlow3, 20, 345);

      gsap.to(`.${styles.ctaHalo}`, { scale: 1.4, opacity: 0, duration: 1.5, repeat: -1, ease: "power1.out" });
      gsap.to(`.${styles.ctaSeta}`, { x: 5, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });

      // Inclinação sutil do cartão de vidro seguindo o mouse — só em ponteiro fino (mouse/trackpad),
      // nunca no toque, pra não brigar com o gesto de rolar/tocar no celular (a grande maioria de
      // quem reserva por aqui).
      const ponteiroFino = window.matchMedia("(pointer: fine)").matches;

      aoMoverPonteiro = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to("#bw1", { x: nx * -26, y: ny * -18, duration: 1.3, ease: "power2.out", overwrite: "auto" });
        gsap.to("#bw2", { x: nx * 32, y: ny * 22, duration: 1.3, ease: "power2.out", overwrite: "auto" });
        gsap.to("#bw3", { x: nx * -40, y: ny * 26, duration: 1.3, ease: "power2.out", overwrite: "auto" });

        if (ponteiroFino) {
          const cartaoAtivo = q(`.${styles.cena}.${styles.ativa} .${styles.cartaoVidro}`);
          if (cartaoAtivo) {
            gsap.to(cartaoAtivo, {
              rotateX: ny * -4,
              rotateY: nx * 5,
              transformPerspective: 800,
              duration: 0.7,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
        }
      };
      window.addEventListener("pointermove", aoMoverPonteiro);
    }

    animarEntrada(q(`.${styles.cena}.${styles.ativa}`)!);

    return () => {
      document.removeEventListener("keydown", aoTeclarNavegacao);
      if (aoMoverPonteiro) window.removeEventListener("pointermove", aoMoverPonteiro);
      gsap.killTweensOf(
        `.${styles.brilhoOrbe}, .${styles.brilhoWrap}, .${styles.ctaHalo}, .${styles.ctaSeta}, .${styles.cartaoVidro}, #bw1, #bw2, #bw3`
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sobrescreve --acento/--acento-hi/--acento-deep e os 3 tons do brilho de fundo (--glow-1/2/3)
  // com a cor extraída do logo do restaurante (ver src/lib/corDoLogo.ts) — sem foto/cor cadastrada
  // ainda, undefined aqui deixa os valores padrão do CSS module valendo (paleta índigo de sempre).
  const estiloDaPaleta = config.paleta
    ? ({
        "--acento": config.paleta.acento,
        "--acento-hi": config.paleta.acentoHi,
        "--acento-deep": config.paleta.acentoDeep,
        "--glow-1": config.paleta.glow1,
        "--glow-2": config.paleta.glow2,
        "--glow-3": config.paleta.glow3,
      } as unknown as React.CSSProperties)
    : undefined;

  if (!config.aceitaReservas) {
    return (
      <div ref={raizRef} className={styles.pagina} style={estiloDaPaleta}>
        <DefinicoesDoVidroLiquidoExterno />
        <div className={styles.atmosfera}>
          <div className={styles.brilhoWrap} id="bw1">
            <div className={`${styles.brilhoOrbe} ${styles.o1}`} />
          </div>
          <div className={styles.brilhoWrap} id="bw2">
            <div className={`${styles.brilhoOrbe} ${styles.o2}`} />
          </div>
        </div>
        <div className={styles.tecido} />
        <div className={styles.grao} />
        <div className={styles.palco}>
          <div className={styles.fechadoCartao}>
            <h1 className={styles.perguntaTitulo} style={{ marginTop: 0 }}>
              {config.nomeConta}
            </h1>
            <p className={styles.subtitulo}>{config.mensagemFechado}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={raizRef} className={styles.pagina} style={estiloDaPaleta}>
      <DefinicoesDoVidroLiquidoExterno />
      <div className={styles.atmosfera}>
        <div className={styles.brilhoWrap} id="bw1">
          <div className={`${styles.brilhoOrbe} ${styles.o1}`} />
        </div>
        <div className={styles.brilhoWrap} id="bw2">
          <div className={`${styles.brilhoOrbe} ${styles.o2}`} />
        </div>
        <div className={styles.brilhoWrap} id="bw3">
          <div className={`${styles.brilhoOrbe} ${styles.o3}`} />
        </div>
      </div>
      <div className={styles.tecido} />
      <div className={styles.grao} />
      <div className={styles.progresso}>
        <div className={styles.progressoBarra} />
      </div>
      <button className={styles.voltar} aria-label="Voltar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>Voltar</span>
      </button>
      <div className={styles.pontos} />

      <div className={styles.palco}>
        <div className={`${styles.cena} ${styles.ativa}`} data-cena="abertura">
          <div className={styles.cenaInterna}>
            {config.logoUrl && !logoFalhou && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logoUrl}
                alt=""
                onError={() => setLogoFalhou(true)}
                className={`${styles.logoAbertura} ${styles.elem}`}
              />
            )}
            <span className={`${styles.numeroPergunta} ${styles.elem}`} style={{ justifyContent: "center", width: "100%" }}>
              {config.nomeConta}
            </span>
            <h1 className={`${styles.titulo} ${styles.elem}`}>Vamos reservar sua mesa?</h1>
            <p className={`${styles.subtitulo} ${styles.elem}`}>Reserva simples e rápida</p>
            <input id="campo-nome" type="text" autoComplete="name" placeholder="Como você se chama?" className={`${styles.campo} ${styles.campoNome} ${styles.elem}`} />
            <button className={`${styles.cta} ${styles.elem}`} id="btn-comecar">
              <span className={styles.ctaHalo} />
              <span>Começar</span>
              <span className={styles.ctaSeta}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <div className={styles.cena} data-cena="dia">
          <div className={styles.cenaInterna}>
            <span className={`${styles.numeroPergunta} ${styles.elem}`}>
              <span className={styles.numeroBolha}>1</span>Pra quando é a reserva?
            </span>
            <h2 className={`${styles.perguntaTitulo} ${styles.elem}`}>Escolha o dia</h2>
            <div className={`${styles.cartaoVidro} ${styles.elem}`}>
              <div className={styles.calendario}>
                <div className={styles.calendarioTopo}>
                  <button className={styles.calSeta} id="cal-anterior" aria-label="Mês anterior">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className={styles.calMes} id="cal-mes-ano">
                    —
                  </span>
                  <button className={styles.calSeta} id="cal-proximo" aria-label="Próximo mês">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <div className={styles.calendarioSemana}>
                  <span>D</span>
                  <span>S</span>
                  <span>T</span>
                  <span>Q</span>
                  <span>Q</span>
                  <span>S</span>
                  <span>S</span>
                </div>
                <div className={styles.calendarioGrade} id="cal-grade" />
              </div>
              <div className={`${styles.continuarLinha} ${styles.elem}`} style={{ marginTop: 20 }}>
                <button className={styles.botaoPrincipal} id="btn-dia-continuar">
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cena} data-cena="periodo">
          <div className={styles.cenaInterna}>
            <span className={`${styles.numeroPergunta} ${styles.elem}`}>
              <span className={styles.numeroBolha}>2</span>Almoço ou jantar?
            </span>
            <div className={styles.iconeHero}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle className="tracoDesenha" cx="12" cy="12" r="9" />
                <path className="ponteiro" d="M12 7v5l3.2 2" />
              </svg>
            </div>
            <h2 className={`${styles.perguntaTitulo} ${styles.elem}`}>Qual horário?</h2>
            <div className={`${styles.cartaoVidro} ${styles.elem}`}>
              <div className={styles.opcoes}>
                <button className={`${styles.opcao} ${styles.elem}`} data-valor="almoco">
                  <span className={styles.tecla}>
                    <svg>
                      <use href="#icone-sol" />
                    </svg>
                  </span>
                  Almoço
                  <span className={styles.check}>✓</span>
                </button>
                <button className={`${styles.opcao} ${styles.elem}`} data-valor="jantar">
                  <span className={styles.tecla}>
                    <svg>
                      <use href="#icone-lua" />
                    </svg>
                  </span>
                  Jantar
                  <span className={styles.check}>✓</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cena} data-cena="pessoas">
          <div className={styles.cenaInterna}>
            <span className={`${styles.numeroPergunta} ${styles.elem}`}>
              <span className={styles.numeroBolha}>3</span>Tamanho do grupo
            </span>
            <h2 className={`${styles.perguntaTitulo} ${styles.elem}`}>Quantas pessoas?</h2>
            <div className={`${styles.cartaoVidro} ${styles.elem}`}>
              <div className={`${styles.contadorLinha} ${styles.elem}`}>
                <button className={styles.contadorBotao} id="btn-pessoas-menos" aria-label="Diminuir">
                  –
                </button>
                <span className={styles.contadorNumero} id="numero-pessoas">
                  2
                </span>
                <button className={styles.contadorBotao} id="btn-pessoas-mais" aria-label="Aumentar">
                  +
                </button>
              </div>
              <div className={`${styles.cadeiras} ${styles.elem}`} id="cadeiras" />
              <div className={`${styles.continuarLinha} ${styles.elem}`} style={{ flexDirection: "column" }}>
                <button className={styles.botaoPrincipal} id="btn-pessoas-continuar">
                  Continuar
                </button>
                <span className={styles.dica} id="dica-pessoas" />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cena} data-cena="whatsapp">
          <div className={styles.cenaInterna}>
            <span className={`${styles.numeroPergunta} ${styles.elem}`}>
              <span className={styles.numeroBolha}>4</span>Contato
            </span>
            <h2 className={`${styles.perguntaTitulo} ${styles.elem}`}>Qual o melhor WhatsApp?</h2>
            <div className={`${styles.cartaoVidro} ${styles.elem}`}>
              <input id="campo-whatsapp" type="tel" inputMode="tel" placeholder="(00) 00000-0000" className={`${styles.campo} ${styles.elem}`} />
              <span className={`${styles.dica} ${styles.elem}`} id="dica-whatsapp">
                com DDD, por favor
              </span>
              <div className={`${styles.continuarLinha} ${styles.elem}`}>
                <button className={styles.botaoPrincipal} id="btn-whatsapp-continuar">
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cena} data-cena="confirmacao">
          <div className={styles.cenaInterna}>
            <span className={`${styles.numeroPergunta} ${styles.elem}`} style={{ justifyContent: "center", width: "100%" }}>
              <span className={styles.numeroBolha}>5</span>Última etapa
            </span>
            <h2 className={`${styles.perguntaTitulo} ${styles.elem}`} style={{ textAlign: "center" }} id="titulo-confirmacao">
              Tudo certo?
            </h2>
            <div className={`${styles.cartaoVidro} ${styles.elem}`}>
              <div className={styles.resumo}>
                <div className={styles.resumoLinha}>
                  <span>Dia</span>
                  <span id="resumo-dia">—</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span>Período</span>
                  <span id="resumo-periodo">—</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span>Pessoas</span>
                  <span id="resumo-pessoas">—</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span>WhatsApp</span>
                  <span id="resumo-whatsapp">—</span>
                </div>
              </div>
              {config.regrasTexto && <p className={styles.regras}>{config.regrasTexto}</p>}
            </div>
            <button className={`${styles.cta} ${styles.elem}`} id="btn-confirmar">
              Confirmar reserva
            </button>
            <span className={styles.dica} id="dica-confirmacao" />
          </div>
        </div>

        <div className={styles.cena} data-cena="fim">
          <div className={styles.cenaInterna}>
            <div className={`${styles.selo} ${styles.elem}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--acento)" }}>
                <path id="check-path" d="M4 12l5 5L20 6" />
              </svg>
            </div>
            <h1 className={`${styles.titulo} ${styles.elem}`} style={{ fontSize: "clamp(30px,7vw,42px)" }}>
              Reserva confirmada!
            </h1>
            <p className={`${styles.subtitulo} ${styles.elem}`} id="fim-texto">
              {config.mensagemConfirmada}
            </p>
            <a
              id="link-agenda"
              href="#"
              target="_blank"
              rel="noreferrer"
              className={`${styles.botaoAgenda} ${styles.elem}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <path d="M8 15l2.5 2.5L16 12" />
              </svg>
              Adicionar à agenda
            </a>
          </div>
        </div>
      </div>

      <svg width="0" height="0" style={{ position: "absolute" }}>
        <symbol id="icone-cadeira" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 11V4.8a1.3 1.3 0 0 1 1.3-1.3h6.4A1.3 1.3 0 0 1 16.5 4.8V11" />
            <path d="M5.8 11h12.4a1 1 0 0 1 1 1.15l-.55 3.85H5.35l-.55-3.85A1 1 0 0 1 5.8 11Z" />
            <path d="M6.3 16v4.3M9 16v2.6M15 16v2.6M17.7 16v4.3" />
          </g>
        </symbol>
        <symbol id="icone-sol" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </g>
        </symbol>
        <symbol id="icone-lua" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </g>
        </symbol>
      </svg>
    </div>
  );
}
