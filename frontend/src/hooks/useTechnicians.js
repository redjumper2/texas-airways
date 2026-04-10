import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useTechnicians(params = {}) {
  return useQuery({
    queryKey: ["technicians", params],
    queryFn: () => api.getTechnicians(params),
  });
}

export function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTechnician,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateTechnician(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useDeleteTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTechnician,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
