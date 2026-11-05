import { handle } from "@/lib/http";
import { getSpend } from "@/features/spend/server";

export const GET = handle(async () => Response.json(await getSpend()));
