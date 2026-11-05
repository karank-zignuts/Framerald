import { readJson } from "@/features/generations/api";
import type { SpendDto } from "./server";

// `import type` is erased, so the server-only module is not bundled.
export const fetchSpend = () => fetch("/api/spend").then((r) => readJson<SpendDto>(r));
