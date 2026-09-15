import * as THREE from "three";
import gsap from "gsap";

// Motor 3D da experiência de reserva externa (ver page.tsx). Fica isolado num módulo próprio,
// sem nenhuma dependência do React, pra ficar fácil de testar/ajustar sozinho e pra garantir que
// toda a manipulação da cena (câmera, luzes, malhas) mora num lugar só. Usa `three` e `gsap` como
// dependências reais do projeto (não carregadas de CDN em tempo de execução) — de propósito,
// depois de um protótipo em Artifact ter quebrado justamente por um link de CDN externo não
// carregar; aqui elas vêm empacotadas junto com o resto do app, sem depender de rede nenhuma além
// da que já carrega a página.

const COR_OURO = 0xe8b769;
const TOTAL_LUZINHAS = 10;

function comoPromise(tl: gsap.core.Timeline): Promise<void> {
  return new Promise((resolver) => {
    tl.eventCallback("onComplete", () => resolver());
  });
}

export class CenaWebGL {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private relogio = new THREE.Clock();
  private rafId: number | null = null;
  private ponteiro = { x: 0, y: 0 };
  private reduzMovimento: boolean;
  private ativo = true;

  private luzQuente: THREE.PointLight;

  private grupoAbertura = new THREE.Group();
  private noAbertura: THREE.Mesh<THREE.TorusKnotGeometry, THREE.MeshStandardMaterial>;

  private grupoPortais = new THREE.Group();
  private portais: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>[] = [];

  private grupoPessoas = new THREE.Group();
  private nucleo: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  private luzinhas: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 9);

    this.scene.add(new THREE.AmbientLight(0x2a1c10, 1.1));
    this.luzQuente = new THREE.PointLight(COR_OURO, 3.2, 30);
    this.luzQuente.position.set(3, 2, 5);
    this.scene.add(this.luzQuente);
    const luzFria = new THREE.PointLight(0x6f8fb0, 1.6, 30);
    luzFria.position.set(-4, -1, 3);
    this.scene.add(luzFria);

    // poeira ambiente
    const N = 260;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const poeiraGeo = new THREE.BufferGeometry();
    poeiraGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const poeira = new THREE.Points(
      poeiraGeo,
      new THREE.PointsMaterial({ color: COR_OURO, size: 0.045, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.scene.add(poeira);
    this.poeira = poeira;

    // grupo 0 — nó dourado da abertura
    this.noAbertura = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.5, 0.42, 220, 24),
      new THREE.MeshStandardMaterial({ color: 0x8a5a24, emissive: COR_OURO, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.35 })
    );
    this.grupoAbertura.add(this.noAbertura);
    this.scene.add(this.grupoAbertura);

    // grupo 1 — portais (reconstruído a cada etapa de escolha: dia, depois período)
    this.grupoPortais.visible = false;
    this.scene.add(this.grupoPortais);

    // grupo 2 — constelação de pessoas (usada nas etapas de pessoas / whatsapp / confirmação)
    this.nucleo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 2),
      new THREE.MeshStandardMaterial({ color: 0x241a10, emissive: COR_OURO, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0 })
    );
    this.grupoPessoas.add(this.nucleo);
    for (let i = 0; i < TOTAL_LUZINHAS; i++) {
      const angulo = (i / TOTAL_LUZINHAS) * Math.PI * 2;
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xf6d9a3, emissive: 0xf6d9a3, emissiveIntensity: 1, transparent: true, opacity: 0 })
      );
      l.userData.angulo = angulo;
      l.scale.setScalar(0.001);
      this.grupoPessoas.add(l);
      this.luzinhas.push(l);
    }
    this.grupoPessoas.visible = false;
    this.scene.add(this.grupoPessoas);

    window.addEventListener("resize", this.aoRedimensionar);
    this.animar();
  }

  private poeira: THREE.Points;

  private aoRedimensionar = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  atualizarPonteiro(nx: number, ny: number) {
    this.ponteiro.x = nx;
    this.ponteiro.y = ny;
  }

  private animar = () => {
    if (!this.ativo) return;
    const t = this.relogio.getElapsedTime();

    this.noAbertura.rotation.x = t * 0.18;
    this.noAbertura.rotation.y = t * 0.26;

    this.portais.forEach((m, i) => {
      m.rotation.x = t * 0.3 + i;
      m.rotation.y = t * 0.22 + i;
    });

    this.nucleo.rotation.y = t * 0.3;
    this.luzinhas.forEach((l) => {
      const angulo = (l.userData.angulo as number) + t * 0.15;
      const raio = 2.3;
      l.position.set(Math.cos(angulo) * raio, Math.sin(angulo) * raio * 0.6, Math.sin(angulo) * 1.2);
    });

    this.poeira.rotation.y = t * 0.015;

    if (!this.reduzMovimento) {
      this.camera.position.x += (this.ponteiro.x * 0.6 - this.camera.position.x) * 0.04;
      this.scene.rotation.y += (this.ponteiro.x * 0.06 - this.scene.rotation.y) * 0.04;
      this.scene.rotation.x += (-this.ponteiro.y * 0.04 - this.scene.rotation.x) * 0.04;
    }

    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.animar);
  };

  /** Chamada uma única vez, ao tocar em "Começar": a câmera atravessa o nó dourado da abertura e
   * os primeiros portais (a pergunta do dia) aparecem do outro lado. */
  sairDaAberturaParaPortais(cores: number[]): Promise<void> {
    this.reconstruirPortais(cores);

    const tl = gsap.timeline();
    tl.set(this.noAbertura.material, { transparent: true }, 0)
      .to(this.camera.position, { z: 1.4, duration: 1.2, ease: "power2.inOut" }, 0)
      .to(this.grupoAbertura.scale, { x: 2.6, y: 2.6, z: 2.6, duration: 1.2, ease: "power2.inOut" }, 0)
      .to(this.noAbertura.material, { opacity: 0, duration: 0.6 }, 0.5)
      .call(
        () => {
          this.grupoAbertura.visible = false;
          this.grupoPortais.visible = true;
          this.camera.position.z = 7;
          this.grupoAbertura.scale.set(1, 1, 1);
        },
        undefined,
        1.15
      )
      .to(this.camera.position, { z: 5.4, duration: 1, ease: "power3.out" }, 1.2)
      .to(
        this.portais.map((m) => m.scale),
        { x: 1, y: 1, z: 1, duration: 0.9, stagger: 0.1, ease: "back.out(1.8)" },
        1.3
      )
      .to(
        this.portais.map((m) => m.material),
        { opacity: 1, duration: 0.7, stagger: 0.1 },
        1.3
      );

    return comoPromise(tl);
  }

  /** Recria o conjunto de portais (2 ou 3, dependendo da etapa) já escondidos/pequenos, prontos
   * pra `revelarPortais` animar a entrada. */
  private reconstruirPortais(cores: number[]) {
    this.portais.forEach((m) => {
      this.grupoPortais.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this.portais = [];

    const espaco = 2.6;
    cores.forEach((cor, i) => {
      const x = (i - (cores.length - 1) / 2) * espaco;
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.85, 1),
        new THREE.MeshStandardMaterial({ color: 0x201812, emissive: cor, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0 })
      );
      m.position.set(x, 0.3, 0);
      m.scale.setScalar(0.001);
      this.grupoPortais.add(m);
      this.portais.push(m);
    });
  }

  /** Usada quando os portais já estão escondidos (depois de `retrairPortais`) e a próxima etapa
   * também é de escolha por portal — ex.: dia → período. */
  revelarPortais(cores: number[]): Promise<void> {
    this.reconstruirPortais(cores);
    this.grupoPortais.visible = true;

    const tl = gsap.timeline();
    tl.to(this.camera.position, { z: 5.4, duration: 0.9, ease: "power3.out" }, 0)
      .to(
        this.portais.map((m) => m.scale),
        { x: 1, y: 1, z: 1, duration: 0.9, stagger: 0.1, ease: "back.out(1.8)" },
        0.15
      )
      .to(
        this.portais.map((m) => m.material),
        { opacity: 1, duration: 0.7, stagger: 0.1 },
        0.15
      );

    return comoPromise(tl);
  }

  destacarPortal(indice: number, ligado: boolean) {
    const m = this.portais[indice];
    if (!m) return;
    gsap.to(m.material, { emissiveIntensity: ligado ? 1.1 : 0.35, duration: ligado ? 0.35 : 0.5 });
    gsap.to(m.scale, { x: ligado ? 1.18 : 1, y: ligado ? 1.18 : 1, z: ligado ? 1.18 : 1, duration: ligado ? 0.35 : 0.5 });
  }

  /** O portal escolhido cresce em direção à câmera enquanto os outros voam pra escuridão e somem;
   * ao final, o grupo inteiro fica escondido e a câmera volta pro repouso — pronta pra próxima
   * etapa (seja outro conjunto de portais, seja a constelação de pessoas). */
  retrairPortais(indiceEscolhido: number): Promise<void> {
    const escolhido = this.portais[indiceEscolhido];
    const outros = this.portais.filter((_, i) => i !== indiceEscolhido);

    const tl = gsap.timeline();
    if (escolhido) {
      tl.to(escolhido.scale, { x: 2.4, y: 2.4, z: 2.4, duration: 1.1, ease: "power2.inOut" }, 0)
        .to(escolhido.position, { z: 2, duration: 1.1, ease: "power2.inOut" }, 0);
    }
    tl.to(
      outros.map((m) => m.position),
      { z: -6, duration: 0.9, ease: "power2.in" },
      0
    )
      .to(
        outros.map((m) => m.material),
        { opacity: 0, duration: 0.7 },
        0
      )
      .to(this.camera.position, { z: 4.6, duration: 1.1, ease: "power2.inOut" }, 0)
      .call(
        () => {
          this.grupoPortais.visible = false;
          this.camera.position.z = 6.5;
        },
        undefined,
        1.05
      );

    return comoPromise(tl);
  }

  /** Primeira vez que a constelação de pessoas aparece (depois de escolhido o período). */
  revelarConstelacao(): Promise<void> {
    this.grupoPessoas.visible = true;
    const tl = gsap.timeline();
    tl.to(this.camera.position, { z: 5.2, duration: 1, ease: "power3.out" }, 0)
      .to(this.nucleo.material, { opacity: 1, duration: 0.8 }, 0.15)
      .fromTo(this.nucleo.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(1.6)" }, 0.15);

    return comoPromise(tl);
  }

  /** Acende (ou apaga) as luzinhas da constelação até a quantidade `n` — chamada a cada clique
   * nos botões de + / -, não é uma transição de etapa. */
  revelarPessoas(n: number) {
    this.luzinhas.forEach((l, i) => {
      const alvo = i < n ? 1 : 0.001;
      gsap.to(l.scale, { x: alvo, y: alvo, z: alvo, duration: 0.5, ease: "back.out(2)" });
      gsap.to(l.material, { opacity: i < n ? 1 : 0, duration: 0.4 });
    });
    gsap.to(this.luzQuente, { intensity: 3.2 + n * 0.15, duration: 0.4 });
  }

  /** Etapa do WhatsApp: as luzinhas se apagam (a pergunta não é mais "quantas pessoas"), o núcleo
   * fica sozinho, respirando devagar pro resto da experiência. A respiração roda separada da
   * timeline devolvida — ela nunca termina de propósito (repeat infinito), então não pode ser a
   * mesma promessa que a chamada `await` espera, senão travaria pra sempre. */
  avancarParaSereno(): Promise<void> {
    const tl = gsap.timeline();
    this.luzinhas.forEach((l, i) => {
      tl.to(l.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.4 }, i * 0.03);
      tl.to(l.material, { opacity: 0, duration: 0.3 }, i * 0.03);
    });

    gsap.to(this.nucleo.material, { emissiveIntensity: 0.8, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.3 });

    return comoPromise(tl);
  }

  /** Etapa final: o núcleo se expande num brilho quente — o "sim" visual antes da confirmação de
   * verdade aparecer em texto. */
  avancarParaFinal(): Promise<void> {
    // mata a respiração infinita iniciada em avancarParaSereno — senão ela continua brigando
    // com o brilho final por cima, pra sempre.
    gsap.killTweensOf(this.nucleo.material, "emissiveIntensity");

    const tl = gsap.timeline();
    tl.to(this.nucleo.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 1, ease: "power2.out" }, 0)
      .to(this.nucleo.material, { emissiveIntensity: 1.4, duration: 1 }, 0)
      .to(this.camera.position, { z: 6, duration: 1, ease: "power2.out" }, 0);

    return comoPromise(tl);
  }

  destruir() {
    this.ativo = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.aoRedimensionar);
    // a respiração do núcleo (avancarParaSereno) roda em loop infinito — sem isso ela continuaria
    // tentando animar um material já descartado depois de sair da página.
    gsap.killTweensOf(this.nucleo.material);
    gsap.killTweensOf(this.luzQuente);
    this.renderer.dispose();
  }
}
