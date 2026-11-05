import { useQuery } from "@tanstack/react-query";
import { fetchSpend } from "./api";

export const useSpend = () => useQuery({ queryKey: ["spend"], queryFn: fetchSpend, staleTime: 30_000 });
