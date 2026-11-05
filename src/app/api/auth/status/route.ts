import { authConfig } from "@/lib/auth/config";

// Lets the page know whether to show "Sign out". Says nothing else.
export function GET() {
  return Response.json({ enabled: authConfig().enabled });
}
