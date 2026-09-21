"use client";

import { useState } from "react";
import styles from "./pagina.module.css";

type Estado = { tipo: "ocioso" } | { tipo: "enviando" } | { tipo: "ok"; mensagem: string } | { tipo: "erro"; mensagem: string };

export function FormularioContato() {
  const [estado, setEstado] = useState<Estado>({ tipo: "ocioso" });

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);

    setEstado({ tipo: "enviando" });
    try {
      const resposta = await fetch("/api/site/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: dados.get("nome"),
          whatsapp: dados.get("whatsapp"),
          restaurante: dados.get("restaurante"),
          mensagem: dados.get("mensagem"),
        }),
      });
      const resultado = await resposta.json();
      if (resultado.ok) {
        setEstado({ tipo: "ok", mensagem: resultado.mensagem });
        form.reset();
      } else {
        setEstado({ tipo: "erro", mensagem: resultado.mensagem });
      }
    } catch {
      setEstado({ tipo: "erro", mensagem: "Sem internet? Tenta de novo." });
    }
  }

  if (estado.tipo === "ok") {
    return (
      <div className={styles.formularioCard}>
        <p className={styles.formularioOk}>{estado.mensagem}</p>
      </div>
    );
  }

  return (
    <form className={styles.formularioCard} onSubmit={aoEnviar}>
      <div className={styles.formularioGrid}>
        <div className={styles.campo}>
          <label htmlFor="contato-nome">Nome</label>
          <input id="contato-nome" name="nome" type="text" required minLength={2} className={styles.input} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="contato-restaurante">Restaurante</label>
          <input id="contato-restaurante" name="restaurante" type="text" required className={styles.input} />
        </div>
      </div>
      <div className={styles.campo}>
        <label htmlFor="contato-whatsapp">WhatsApp</label>
        <input id="contato-whatsapp" name="whatsapp" type="tel" required minLength={8} className={styles.input} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="contato-mensagem">Mensagem (opcional)</label>
        <textarea id="contato-mensagem" name="mensagem" rows={3} className={styles.textarea} />
      </div>

      {estado.tipo === "erro" && <p className={styles.formularioErro}>{estado.mensagem}</p>}

      <button type="submit" className={styles.ctaPrimario} disabled={estado.tipo === "enviando"}>
        {estado.tipo === "enviando" ? "Enviando…" : "Quero colocar meu restaurante no AutoMesa"}
      </button>
    </form>
  );
}
