import type { AssetDto } from "@/features/library/types";

export type GenerationResult = {
  id: string;
  status: "succeeded" | "failed";
  error: string | null;
  costUsd: number | null; // null = unknown
  assets: AssetDto[];
};
