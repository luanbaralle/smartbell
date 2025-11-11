export const buildHouseQrUrl = (houseId: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/bell/${houseId}`;

