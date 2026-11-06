"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProjectRequest, deleteProjectRequest, renameProjectRequest, restoreProjectRequest } from "@/features/projects/api";
import { projectKeys } from "@/features/projects/queries";

/** Create, rename, delete and restore, with the lists refreshed and a plain message when something fails. */
export function useProjectActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: projectKeys.all });
  const fail = (fallback: string) => (error: unknown) => {
    toast.error(error instanceof Error ? error.message : fallback);
    throw error;
  };
  return {
    async create(name: string) {
      const made = await createProjectRequest(name).catch(fail("Couldn't create the project."));
      await refresh();
      return made;
    },
    async rename(id: string, name: string) {
      await renameProjectRequest(id, name).catch(fail("Couldn't rename the project."));
      await refresh();
    },
    async remove(id: string) {
      await deleteProjectRequest(id).catch(fail("Couldn't delete the project."));
      await refresh();
    },
    async restore(id: string) {
      await restoreProjectRequest(id).catch(fail("Couldn't restore the project."));
      await refresh();
    },
  };
}
