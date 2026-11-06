import { readJson } from "@/features/generations/api";
import type { ProjectDto, ProjectsDto } from "./schemas";

const json = { "content-type": "application/json" };

export const fetchProjects = () => fetch("/api/projects").then((r) => readJson<ProjectsDto>(r));
export const fetchDeletedProjects = () => fetch("/api/projects?trash=1").then((r) => readJson<ProjectDto[]>(r));

export const createProjectRequest = (name: string) =>
  fetch("/api/projects", { method: "POST", headers: json, body: JSON.stringify({ name }) }).then((r) => readJson<ProjectDto>(r));

export const renameProjectRequest = (id: string, name: string) =>
  fetch(`/api/projects/${id}`, { method: "PATCH", headers: json, body: JSON.stringify({ name }) }).then((r) => readJson<ProjectDto>(r));

export const deleteProjectRequest = (id: string) =>
  fetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => readJson<unknown>(r).then(() => undefined));

export const restoreProjectRequest = (id: string) =>
  fetch(`/api/projects/${id}/restore`, { method: "POST" }).then((r) => readJson<ProjectDto>(r));
