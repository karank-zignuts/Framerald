"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { selectedPresets } from "@/components/presets/preset-picker";
import { AssetDialog } from "@/components/media/asset-dialog";
import { refinePromptRequest } from "@/features/agent/api";
import { generate, uploadReference, type GenerateInput } from "@/features/generations/api";
import { MAX_REFERENCES } from "@/features/generations/schemas";
import { deleteAsset, renameAssetRequest, setFavorite } from "@/features/library/api";
import { libraryKeys } from "@/features/library/queries";
import { usePresets } from "@/features/presets/queries";
import { useCurrentProject } from "@/features/projects/queries";
import { applyPresets } from "@/features/presets/templates";
import type { AssetDto, ReRunSettings } from "@/features/library/types";
import type { ImageSize } from "@/lib/ai/models";
import { useViewSettings } from "@/features/view/settings";
import { Composer, type ComposerValues } from "./composer";
import { Results, type Batch } from "./results";

export type StudioInitial = Partial<ReRunSettings> & { sourceGenerationId?: string };

const BLANK: ComposerValues = {
  prompt: "",
  model: "default",
  aspectRatio: "1:1",
  imageSize: "1K",
  count: 1,
  references: [],
  presetIds: [],
};

let batchCounter = 0;
const nextKey = () => `batch-${Date.now()}-${batchCounter++}`;

/** The composer on the left, this session's results on the right. Mount with a key to start from new settings. */
export function StudioWorkspace({ initial, notice }: { initial: StudioInitial | null; notice?: string | null }) {
  const qc = useQueryClient();
  const presets = usePresets("image");
  const [projectId, setProjectId] = useCurrentProject();
  const [values, setValues] = useState<ComposerValues>({
    ...BLANK,
    ...(initial?.prompt !== undefined && { prompt: initial.prompt }),
    ...(initial?.model && { model: initial.model }),
    ...(initial?.aspectRatio && { aspectRatio: initial.aspectRatio }),
    ...(initial?.imageSize && { imageSize: initial.imageSize as ImageSize }),
    ...(initial?.count && { count: initial.count }),
    ...(initial?.references && { references: initial.references }),
  });
  const [batches, setBatches] = useState<Batch[]>([]);
  const view = useViewSettings();
  const [uploading, setUploading] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [beforeRefine, setBeforeRefine] = useState<string | null>(null); // the prompt as it was, for Undo

  const openAsset = batches.flatMap((b) => b.result?.assets ?? []).find((a) => a.id === openId) ?? null;

  const patch = (p: Partial<ComposerValues>) => {
    setValues((v) => ({ ...v, ...p }));
    if (p.prompt !== undefined) setBeforeRefine(null); // typing by hand ends the Undo window
  };

  async function refine() {
    setRefining(true);
    try {
      const result = await refinePromptRequest(values.prompt, values.aspectRatio);
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
  const updateAsset = (id: string, fn: (a: AssetDto) => AssetDto) =>
    setBatches((all) =>
      all.map((b) => (b.result ? { ...b, result: { ...b.result, assets: b.result.assets.map((a) => (a.id === id ? fn(a) : a)) } } : b)),
    );

  async function run(input: GenerateInput, replaceKey?: string) {
    const key = nextKey();
    setBatches((all) => [{ key, input, status: "running" }, ...all.filter((b) => b.key !== replaceKey)]);
    const finish = (change: Partial<Batch>) => setBatches((all) => all.map((b) => (b.key === key ? { ...b, ...change } : b)));
    try {
      const result = await generate(input);
      finish({ status: result.status === "succeeded" ? "done" : "failed", result, error: result.error ?? undefined });
      void qc.invalidateQueries({ queryKey: libraryKeys.all });
    } catch (error) {
      finish({ status: "failed", error: error instanceof Error ? error.message : "Something went wrong. Try again." });
    }
  }

  const busy = batches.some((b) => b.status === "running");

  function submit() {
    if (busy) return;
    // Presets are added now, so the saved prompt is exactly what was sent.
    const prompt = applyPresets(values.prompt, selectedPresets(presets.data, values.presetIds));
    if (prompt.length > 4000) {
      toast.error(`With the preset added, the prompt is ${prompt.length} characters. The limit is 4,000.`);
      return;
    }
    // The box clears once the request is on its way. A failed batch keeps its own input for Try again.
    if (view.clearOnSubmit) {
      setValues((v) => ({ ...v, prompt: "" }));
      setBeforeRefine(null);
    }
    void run({
      prompt,
      model: values.model,
      aspectRatio: values.aspectRatio as GenerateInput["aspectRatio"],
      imageSize: values.imageSize,
      count: values.count,
      referenceAssetIds: values.references.map((r) => r.id),
      sourceGenerationId: initial?.sourceGenerationId,
      projectId: projectId ?? undefined,
    });
  }

  async function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length < files.length) toast.error("Only png, jpeg and webp images work as references.");
    const room = MAX_REFERENCES - values.references.length - uploading;
    const batch = images.slice(0, Math.max(room, 0));
    if (images.length > batch.length) toast.error(`You can add up to ${MAX_REFERENCES} reference images.`);
    if (batch.length === 0) return;
    setUploading((n) => n + batch.length);
    await Promise.all(
      batch.map(async (file) => {
        try {
          const asset = await uploadReference(file);
          setValues((v) => ({ ...v, references: [...v.references, asset] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "That upload failed.");
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  }

  async function favorite(asset: AssetDto, value: boolean) {
    updateAsset(asset.id, (a) => ({ ...a, isFavorite: value }));
    try {
      await setFavorite(asset.id, value);
      void qc.invalidateQueries({ queryKey: libraryKeys.all });
    } catch (error) {
      updateAsset(asset.id, (a) => ({ ...a, isFavorite: !value }));
      toast.error(error instanceof Error ? error.message : "Couldn't update the favourite.");
    }
  }

  async function rename(asset: AssetDto, name: string | null) {
    await renameAssetRequest(asset.id, name); // throws when it can't be saved; the tile then keeps the name in this browser
    updateAsset(asset.id, (a) => ({ ...a, name }));
    void qc.invalidateQueries({ queryKey: libraryKeys.all });
  }

  async function remove(asset: AssetDto) {
    try {
      await deleteAsset(asset.id);
      setOpenId(null);
      setBatches((all) =>
        all
          .map((b) => (b.result ? { ...b, result: { ...b.result, assets: b.result.assets.filter((a) => a.id !== asset.id) } } : b))
          .filter((b) => b.status !== "done" || (b.result?.assets.length ?? 0) > 0),
      );
      void qc.invalidateQueries({ queryKey: libraryKeys.all });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that image.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Image</h1>
      <section aria-label="Results" className="flex min-h-[20rem] min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <Results batches={batches} onOpen={(a) => setOpenId(a.id)} onFavorite={favorite} onDelete={remove} onRename={rename} onRetry={(b) => void run(b.input, b.key)} />
      </section>
      <section aria-label="Controls" className="sticky bottom-0 z-10 shrink-0 bg-gradient-to-t from-background from-70% to-transparent px-3 pb-3 pt-6 sm:px-5 sm:pb-5">
        <Composer values={values} onChange={patch} onSubmit={submit} onAddFiles={addFiles} uploading={uploading} busy={busy} projectId={projectId} onProjectChange={setProjectId} notice={notice} refining={refining} canUndoRefine={beforeRefine !== null} onRefine={() => void refine()} onUndoRefine={undoRefine} />
      </section>
      {openAsset && (
        <AssetDialog
          key={openAsset.id}
          asset={openAsset}
          onClose={() => setOpenId(null)}
          onFavorite={(v) => void favorite(openAsset, v)}
          onDelete={() => remove(openAsset)}
        />
      )}
    </div>
  );
}
