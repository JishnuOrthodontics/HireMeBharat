import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as employerApi from '../lib/employerApi';

export function useEmployerRequisitions(params?: Parameters<typeof employerApi.getEmployerRequisitions>[0]) {
  return useQuery({
    queryKey: ['employer', 'requisitions', params],
    queryFn: () => employerApi.getEmployerRequisitions(params),
  });
}

export function useCreateEmployerRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employerApi.createEmployerRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer', 'requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['employer', 'dashboardSummary'] });
    },
  });
}

export function useUpdateEmployerRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requisitionId, payload }: { requisitionId: string; payload: Partial<employerApi.EmployerRequisitionApi> }) =>
      employerApi.patchEmployerRequisition(requisitionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer', 'requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['employer', 'dashboardSummary'] });
    },
  });
}

export function useDeleteEmployerRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employerApi.deleteEmployerRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer', 'requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['employer', 'dashboardSummary'] });
    },
  });
}

export function useEmployerCandidates(params?: Parameters<typeof employerApi.getEmployerCandidates>[0]) {
  return useQuery({
    queryKey: ['employer', 'candidates', params],
    queryFn: () => employerApi.getEmployerCandidates(params),
  });
}

export function useUpdateEmployerCandidateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, stage, notes }: { candidateId: string; stage: employerApi.EmployerCandidateStage; notes?: string }) =>
      employerApi.patchEmployerCandidateStage(candidateId, stage, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer', 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['employer', 'dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['employer', 'activity'] });
    },
  });
}

export function useEmployerMatches() {
  return useQuery({
    queryKey: ['employer', 'matches'],
    queryFn: employerApi.getEmployerMatches,
  });
}

export function useEmployerDashboardSummary() {
  return useQuery({
    queryKey: ['employer', 'dashboardSummary'],
    queryFn: async () => {
      const res = await employerApi.getEmployerDashboardSummary();
      return res.summary;
    },
  });
}

export function useEmployerActivity() {
  return useQuery({
    queryKey: ['employer', 'activity'],
    queryFn: async () => {
      const res = await employerApi.getEmployerActivity();
      return res.activity;
    },
  });
}

export function useEmployerProfile() {
  return useQuery({
    queryKey: ['employer', 'profile'],
    queryFn: async () => {
      const res = await employerApi.getEmployerProfile();
      return res.profile;
    },
  });
}

export function useUpdateEmployerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employerApi.patchEmployerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer', 'profile'] });
    },
  });
}
