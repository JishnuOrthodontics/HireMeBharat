import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as employeeApi from '../lib/employeeApi';
import * as employerApi from '../lib/employerApi';
import * as adminApi from '../lib/adminApi';
import type { NotificationApi } from '../lib/employeeApi';

export function useRoleNotifications() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const rawRole = userProfile?.role || 'EMPLOYEE';
  const role = rawRole.toLowerCase() as 'employee' | 'employer' | 'admin';

  // 1. Fetch query
  const query = useQuery({
    queryKey: ['notifications', role],
    queryFn: async (): Promise<NotificationApi[]> => {
      if (!userProfile) return [];
      
      try {
        if (role === 'employer') {
          const res = await employerApi.getEmployerNotifications();
          return res.notifications;
        } else if (role === 'admin') {
          const res = await adminApi.getAdminNotifications();
          return res.notifications;
        } else {
          const res = await employeeApi.getNotifications();
          return res.notifications;
        }
      } catch (err) {
        console.error('Failed to fetch notifications for role', role, err);
        return [];
      }
    },
    enabled: !!userProfile,
    refetchInterval: 60000, // Background poll every minute as fallback
  });

  // 2. Mark Single Read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (role === 'employer') {
        return employerApi.markEmployerNotificationRead(notificationId);
      } else if (role === 'admin') {
        return adminApi.markAdminNotificationRead(notificationId);
      } else {
        return employeeApi.markNotificationRead(notificationId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', role] });
      // Invalidate summaries too
      if (role === 'employee') {
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
      }
    },
  });

  // 3. Mark All Read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (role === 'employer') {
        return employerApi.markAllEmployerNotificationsRead();
      } else if (role === 'admin') {
        return adminApi.markAllAdminNotificationsRead();
      } else {
        return employeeApi.markAllNotificationsRead();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', role] });
      // Invalidate summaries too
      if (role === 'employee') {
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
      }
    },
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    unreadCount: (query.data || []).filter(n => !n.read).length,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
