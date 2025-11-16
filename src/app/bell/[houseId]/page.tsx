import { notFound } from "next/navigation";

import { CallClient } from "@/app/bell/[houseId]/CallClient";
import { listHouseCalls, getCallById } from "@/lib/repository/calls";
import { getHouseById } from "@/lib/repository/houses";
import { listMessagesByCall } from "@/lib/repository/messages";

type PageProps = {
  params: Promise<{
    houseId: string;
  }>;
};

export default async function BellHousePage({ params }: PageProps) {
  const { houseId } = await params;

  const house = await getHouseById(houseId);
  if (!house) {
    notFound();
  }

  // Visitante sempre começa sem chamada - não carregar chamadas antigas
  // Cada acesso é uma nova sessão
  return (
    <CallClient
      house={house}
      initialCall={null}
      initialMessages={[]}
    />
  );
}

