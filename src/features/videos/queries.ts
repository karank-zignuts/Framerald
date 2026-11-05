import { useQuery } from "@tanstack/react-query";
import { fetchVideoJobs } from "./api";

export const videoKeys = { jobs: ["videos", "jobs"] as const };

/** Recent clips, running ones included, so a reload still shows what is in flight. */
export const useVideoJobs = () => useQuery({ queryKey: videoKeys.jobs, queryFn: fetchVideoJobs, staleTime: 0 });
