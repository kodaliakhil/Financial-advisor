import { seedTransactions } from "@/actions/utils/seed";

export async function GET() {
  const result = await seedTransactions();
  return Response.json(result);
}
