"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./pagina.module.css";

// "+10.000" com cada coluna de dígito rodando feito roleta até travar no número final. A fita de
// cada coluna repete 0-9 duas vezes (20 itens) só pra dar uma volta inteira de "giro" antes de
// pousar no dígito certo — sem isso a animação seria só um pulinho de uma casa, sem a sensação de
// contador girando que foi pedida.
const DIGITOS_ALVO = [1, 0, 0, 0, 0];
const VOLTAS = 10;

function ColunaDeDigito({ indice, registrar }: { indice: number; registrar: (el: HTMLDivElement | null) => void }) {
  return (
    <span className={styles.contadorColuna}>
      <div className={styles.contadorFita} ref={registrar}>
        {Array.from({ length: 20 }, (_, n) => (
          <span key={n} className={styles.contadorDigito}>
            {n % 10}
          </span>
        ))}
      </div>
    </span>
  );
}

export function ContadorSocial() {
  const fitasRef = useRef<(HTMLDivElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fitas = fitasRef.current.filter((el): el is HTMLDivElement => el !== null);
    if (fitas.length === 0 || !cardRef.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fitas.forEach((el, i) => gsap.set(el, { yPercent: -((VOLTAS + DIGITOS_ALVO[i]) * (100 / 20)) }));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: cardRef.current,
      start: "top 85%",
      once: true,
      onEnter: () => {
        fitas.forEach((el, i) => {
          gsap.fromTo(
            el,
            { yPercent: 0 },
            {
              yPercent: -((VOLTAS + DIGITOS_ALVO[i]) * (100 / 20)),
              duration: 1.8 + i * 0.18,
              delay: i * 0.07,
              ease: "power3.out",
            }
          );
        });
      },
    });

    return () => {
      trigger.kill();
      gsap.killTweensOf(fitas);
    };
  }, []);

  return (
    <section className={styles.provaSocial}>
      <div className={styles.provaSocialCard} ref={cardRef}>
        <span className={styles.provaSocialTag}>Número real, não estimativa de pitch</span>
        <div className={styles.contador} aria-label="Mais de 10.000 pessoas já reservaram pelo AutoMesa">
          <ColunaDeDigito indice={0} registrar={(el) => (fitasRef.current[0] = el)} />
          <ColunaDeDigito indice={1} registrar={(el) => (fitasRef.current[1] = el)} />
          <span className={styles.contadorPonto}>.</span>
          <ColunaDeDigito indice={2} registrar={(el) => (fitasRef.current[2] = el)} />
          <ColunaDeDigito indice={3} registrar={(el) => (fitasRef.current[3] = el)} />
          <ColunaDeDigito indice={4} registrar={(el) => (fitasRef.current[4] = el)} />
          <span className={styles.contadorMais}>+</span>
        </div>
        <p className={styles.provaSocialTexto}>
          pessoas já reservaram mesa pelo AutoMesa — sistema validado na prática, todos os dias, sem errar uma conta.
        </p>
      </div>
    </section>
  );
}
