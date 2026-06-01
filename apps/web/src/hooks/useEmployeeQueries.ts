import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as employeeApi from '../lib/employeeApi';

export function useEmployeeProfile() {
  return useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await employeeApi.getEmployeeProfile();
      return res.profile;
    },
  });
}

export function useEmployeeProfileStrength() {
  return useQuery({
    queryKey: ['employee', 'profileStrength'],
    queryFn: employeeApi.getEmployeeProfileStrength,
  });
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employeeApi.patchEmployeeProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'profileStrength'] });
    },
  });
}

export function useEmployeeMatches(params?: Parameters<typeof employeeApi.getEmployeeMatches>[0]) {
  return useQuery({
    queryKey: ['employee', 'matches', params],
    queryFn: () => employeeApi.getEmployeeMatches(params),
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, action }: { matchId: string; action: 'interest' | 'save' | 'decline' }) =>
      employeeApi.updateMatchStatus(matchId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
    },
  });
}

export function useConciergeMessages() {
  return useQuery({
    queryKey: ['employee', 'conciergeMessages'],
    queryFn: employeeApi.getConciergeMessages,
  });
}

export function useSendConciergeMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employeeApi.sendConciergeMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'conciergeMessages'] });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['employee', 'notifications'],
    queryFn: async () => {
      const res = await employeeApi.getNotifications();
      return res.notifications;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employeeApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
    },
  });
}

export function useEmployeeDashboardSummary() {
  return useQuery({
    queryKey: ['employee', 'dashboardSummary'],
    queryFn: async () => {
      const res = await employeeApi.getDashboardSummary();
      return res.summary;
    },
  });
}
