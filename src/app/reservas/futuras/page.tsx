import { PainelDeReservas } from "../PainelDeReservas";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function ReservasFuturasPage({
  searchParams,
}: {
  searchParams: { conta?: string; de?: string; ate?: string; periodo?: string; busca?: string };
}) {
  return <PainelDeReservas searchParams={searchParams} modo="futuras" />;
}
