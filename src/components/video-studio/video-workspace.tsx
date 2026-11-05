"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { selectedPresets } from "@/components/presets/preset-picker";
import { refinePromptRequest } from "@/features/agent/api";
import { uploadReference } from "@/features/generations/api";
import { libraryKeys } from "@/features/library/queries";
import { applyPresets } from "@/features/presets/templates";
import { usePresets } from "@/features/presets/queries";
import { fetchVideoJob, fetchVideoReRunSettings, startVideo, type StartVideoInput } from "@/features/videos/api";
import { MAX_VIDEO_PROMPT } from "@/features/videos/schemas";
import { useVideoJobs, videoKeys } from "@/features/videos/queries";
import type { VideoJobDto } from "@/features/videos/types";
import { VideoComposer, type VideoValues } from "./video-composer";
import { VideoResults } from "./video-results";

export type VideoInitial = Partial<VideoValues> & { sourceGenerationId?: string; missingFrames?: boolean };

const BLANK: VideoValues = {
  prompt: "",
  model: "fast",
  aspectRatio: "16:9",
  durationSeconds: 4,
  resolution: "720p",
  audio: false,
  firstFrame: null,
  lastFrame: null,
  presetIds: [],
};

const POLL_MS = 4000;

/** The composer on the left, your clips on the right. Mount with a key to start from new settings. */
export function VideoWorkspace({ initial, notice }: { initial: VideoInitial | null; notice?: string | null }) {
  const qc = useQueryClient();
  const jobs = useVideoJobs();
  const presets = usePresets("video");
  const [values, setValues] = useState<VideoValues>({ ...BLANK, ...(initial && Object.fromEntries(Object.entries(initial).filter(([, v]) => v !== undefined))) });
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState<string[]>([]); // clips whose Try again is in flight
  const [uploadingSlot, setUploadingSlot] = useState<"first" | "last" | null>(null);
  const [refining, setRefining] = useState(false);
  const [beforeRefine, setBeforeRefine] = useState<string | null>(null); // the prompt as it was, for Undo

  const patch = (p: Partial<VideoValues>) => {
    setValues((v) => ({ ...v, ...p }));
    if (p.prompt !== undefined) setBeforeRefine(null); // typing by hand ends the Undo window
  };

  // While any clip is running, ask about it every few seconds. A clip that finishes is saved by that check,
  // so this also resumes after a reload: the list comes back with the running clips and polling starts again.
  const runningKey = (jobs.data ?? [])
    .filter((j) => j.status === "running")
    .map((j) => j.id)
    .join(",");
  useEffect(() => {
    if (!runningKey) return;
    const ids = runningKey.split(",");
    let busy = false;
    let cancelled = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        for (const id of ids) {
          if (cancelled) return;
          try {
            const job = await fetchVideoJob(id);
            qc.setQueryData<VideoJobDto[]>(videoKeys.jobs, (old) => old?.map((j) => (j.id === id ? job : j)));
            if (job.status !== "running") void qc.invalidateQueries({ queryKey: libraryKeys.all });
          } catch {
            // A failed check says nothing about the clip. Try again on the next tick.
          }
        }
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(() => void tick(), 1500);
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [runningKey, qc]);

  const addJob = (job: VideoJobDto) => {
    qc.setQueryData<VideoJobDto[]>(videoKeys.jobs, (old) => [job, ...(old ?? [])]);
    // If the list was still loading, its late answer would erase this card. Asking again cancels that answer.
    void qc.invalidateQueries({ queryKey: videoKeys.jobs });
  };

  async function start(input: StartVideoInput) {
    try {
      addJob(await startVideo(input));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the clip.");
    }
  }

  async function submit() {
    // Presets are added to the prompt now, so the saved prompt is exactly what was sent.
    const prompt = applyPresets(values.prompt, selectedPresets(presets.data, values.presetIds));
    if (prompt.length > MAX_VIDEO_PROMPT) {
      toast.error(`With the presets added, the prompt is ${prompt.length} characters. The limit is ${MAX_VIDEO_PROMPT.toLocaleString("en")}.`);
      return;
    }
    setSubmitting(true);
    await start({
      prompt,
      model: values.model,
      aspectRatio: values.aspectRatio,
      durationSeconds: values.durationSeconds,
      resolution: values.resolution,
      generateAudio: values.audio,
      firstFrameAssetId: values.firstFrame?.id,
      lastFrameAssetId: values.lastFrame?.id,
      sourceGenerationId: initial?.sourceGenerationId,
    });
    setSubmitting(false);
  }

  async function tryAgain(job: VideoJobDto) {
    if (retrying.includes(job.id)) return; // a double click must not bill two clips
    setRetrying((ids) => [...ids, job.id]);
    try {
      const s = await fetchVideoReRunSettings(job.id);
      if (s.missingFrames) {
        toast.error("A frame this clip was made from has been deleted, so it can't be started again as it was. Re-run it from the Library and pick new frames.");
        return;
      }
      await start({
        prompt: s.prompt,
        model: s.model,
        aspectRatio: s.aspectRatio as VideoValues["aspectRatio"],
        durationSeconds: s.durationSeconds as VideoValues["durationSeconds"],
        resolution: s.resolution as VideoValues["resolution"],
        generateAudio: s.audio,
        firstFrameAssetId: s.firstFrame?.id,
        lastFrameAssetId: s.lastFrame?.id,
        sourceGenerationId: job.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the clip again.");
    } finally {
      setRetrying((ids) => ids.filter((id) => id !== job.id));
    }
  }

  async function uploadFrame(slot: "first" | "last", file: File) {
    setUploadingSlot(slot);
    try {
      const asset = await uploadReference(file);
      patch(slot === "first" ? { firstFrame: asset } : { lastFrame: asset });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That upload failed.");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function refine() {
    setRefining(true);
    try {
      const result = await refinePromptRequest(values.prompt, values.aspectRatio, "video");
      setBeforeRefine(values.prompt);
      setValues((v) => ({ ...v, prompt: result.prompt }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The agent couldn't refine that prompt.");
    } finally {
      setRefining(false);
    }
  }

  function undoRefine() {
    if (beforeRefine === null) return;
    setValues((v) => ({ ...v, prompt: beforeRefine }));
    setBeforeRefine(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section aria-label="Controls" className="flex min-h-0 shrink-0 flex-col border-b border-border bg-card lg:w-[26rem] lg:border-b-0 lg:border-r">
        <VideoComposer
          values={values}
          onChange={patch}
          onSubmit={() => void submit()}
          onUploadFrame={(slot, file) => void uploadFrame(slot, file)}
          uploadingSlot={uploadingSlot}
          submitting={submitting}
          onRefine={() => void refine()}
          refining={refining}
          canUndoRefine={beforeRefine !== null}
          onUndoRefine={undoRefine}
          notice={notice}
        />
      </section>
      <section aria-label="Clips" className="flex min-h-[24rem] min-w-0 flex-1 flex-col lg:overflow-hidden">
        <VideoResults
          jobs={jobs.data}
          isPending={jobs.isPending}
          error={jobs.error}
          onRetryLoad={() => void jobs.refetch()}
          onTryAgain={(job) => void tryAgain(job)}
          retryingIds={retrying}
        />
      </section>
    </div>
  );
}
