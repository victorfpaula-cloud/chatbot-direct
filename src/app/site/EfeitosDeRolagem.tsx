"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./pagina.module.css";

// Efeitos de rolagem da home de vendas — cada seção entra com um fade + leve subida + desfoque, uma
// vez só (nunca reverte ao rolar de volta pra cima) — testei com "toggleActions: play reverse play
// reverse" antes e um simples redimensionamento de viewport já destrava o ScrollTrigger o
// suficiente pra fazer conteúdo já lido sumir de novo, o que é pior que não animar nada. Os brilhos
// de fundo derivam devagar conforme a página rola, pra dar profundidade sem atrapalhar a leitura.
// Client Component isolado — a página em si (page.tsx) continua um Server Component estático, sem
// custo de servidor por acesso; isso aqui só reforça o visual depois que o JS carrega no navegador.
export function EfeitosDeRolagem() {
  useEffect(() => {
    // Quem pediu menos movimento no sistema não deveria ganhar parallax nem blur entrando e
    // saindo da tela — o conteúdo já está visível no HTML puro (Server Component), então sem
    // nenhum JS rodando aqui a página continua perfeitamente legível.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const classesParaRevelar = [
      styles.heroTitulo,
      styles.heroSub,
      styles.heroCtas,
      styles.heroNota,
      styles.telefoneWrap,
      styles.eyebrow,
      styles.tituloSecao,
      styles.dekSecao,
      styles.featureCard,
      styles.painelMockWrap,
      styles.tabelaWrap,
      styles.ctaFinalTitulo,
    ];
    const seletor = classesParaRevelar.map((c) => `.${c}`).join(", ");
    const elementos = gsap.utils.toArray<HTMLElement>(seletor);

    const animacoes = elementos.map((el) =>
      gsap.fromTo(
        el,
        { opacity: 0, y: 30, filter: "blur(9px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        }
      )
    );

    const alvosDeParalaxe: [string, number][] = [
      [styles.o1, -70],
      [styles.o2, 60],
      [styles.o3, -45],
    ];
    const paralaxe = alvosDeParalaxe.map(([classe, distancia]) =>
      gsap.to(`.${classe}`, {
        y: distancia,
        ease: "none",
        scrollTrigger: { trigger: document.body, start: 0, end: "max", scrub: 1 },
      })
    );

    ScrollTrigger.refresh();

    return () => {
      [...animacoes, ...paralaxe].forEach((tween) => tween.scrollTrigger?.kill());
      gsap.killTweensOf(elementos);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
