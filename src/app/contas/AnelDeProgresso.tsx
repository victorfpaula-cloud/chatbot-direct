// Anel de progresso (SVG puro, sem interatividade — não precisa ser client component) usado no
// indicador "Stories hoje" de cada cartão. `pct` já vem calculado (postados / total * 100).
export function AnelDeProgresso({ pct }: { pct: number }) {
  const raio = 16;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <svg width="36" height="36" viewBox="0 0 40 40" className="shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r={raio} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={raio}
        fill="none"
        stroke="#6366f1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
