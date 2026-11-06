import { useQuery } from "@tanstack/react-query";
import { fetchVideoJobs } from "./api";

export const videoKeys = { jobs: ["videos", "jobs"] as const, jobsFor: (projectId: string) => ["videos", "jobs", projectId] as const };

/** Recent clips, running ones included, so a reload still shows what is in flight. */
export const useVideoJobs = (projectId: string) => useQuery({ queryKey: videoKeys.jobsFor(projectId), queryFn: () => fetchVideoJobs(projectId), staleTime: 0 });
