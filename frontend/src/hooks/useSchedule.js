import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: api.getSchedule,
  });
}

export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: api.getAuditLog,
  });
}
