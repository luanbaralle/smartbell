import { notFound } from "next/navigation";

import { CallClient } from "@/app/bell/[houseId]/CallClient";
import { listHouseCalls } from "@/lib/repository/calls";
import { getHouseById } from "@/lib/repository/houses";
import { listMessagesByCall } from "@/lib/repository/messages";

type Props = {
  params: {
    houseId: string;
  };
};

export default async function BellHousePage({ params }: Props) {
  const house = await getHouseById(params.houseId);
  if (!house) {
    notFound();
  }

  const calls = await listHouseCalls(house.id);
  const initialCall = calls.at(0) ?? null;
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

