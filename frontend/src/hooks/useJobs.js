import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useJobs(params = {}) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => api.getJobs(params),
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ["jobStats"],
    queryFn: api.getJobStats,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobStats"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateJob(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobStats"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobStats"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useImportJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.importJobs(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobStats"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
