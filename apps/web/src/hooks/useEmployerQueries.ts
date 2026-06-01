import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as employerApi from '../lib/employerApi';



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
