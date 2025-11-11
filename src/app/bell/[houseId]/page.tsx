import { notFound } from "next/navigation";

import { CallClient } from "@/app/bell/[houseId]/CallClient";
import { listHouseCalls } from "@/lib/repository/calls";
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

  const calls = await listHouseCalls(house.id);
  const initialCall = calls.length > 0 ? calls[0] : null;
  const initialMessages = initialCall
    ? await listMessagesByCall(initialCall.id)
    : [];

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <CallClient
        house={house}
        initialCall={initialCall}
        initialMessages={initialMessages}
      />
    </main>
  );
}

