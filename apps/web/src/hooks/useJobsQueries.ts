import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as jobsApi from '../lib/jobsApi';

export function useSearchJobListings(params?: Parameters<typeof jobsApi.searchJobListings>[0]) {
  return useQuery({
    queryKey: ['jobs', 'listings', params],
    queryFn: () => jobsApi.searchJobListings(params),
  });
}

export function useJobListingById(id: string) {
  return useQuery({
    queryKey: ['jobs', 'listing', id],
    queryFn: async () => {
      const res = await jobsApi.getJobListingById(id);
      return res.listing;
    },
    enabled: !!id,
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: Parameters<typeof jobsApi.applyToJob>[1] }) =>
      jobsApi.applyToJob(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listings'] });
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ['jobs', 'applications'],
    queryFn: async () => {
      const res = await jobsApi.getMyApplications();
      return res.applications;
    },
  });
}

export function useApplicationById(id: string) {
  return useQuery({
    queryKey: ['jobs', 'application', id],
    queryFn: async () => {
      const res = await jobsApi.getApplicationById(id);
      return res.application;
    },
    enabled: !!id,
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.withdrawApplication,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'application', id] });
    },
  });
}

export function useMyOffers() {
  return useQuery({
    queryKey: ['jobs', 'offers'],
    queryFn: async () => {
      const res = await jobsApi.getMyOffers();
      return res.offers;
    },
  });
}

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, accept }: { offerId: string; accept: boolean }) =>
      jobsApi.respondToOffer(offerId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'offers'] });
    },
  });
}

export function useMyInterviews() {
  return useQuery({
    queryKey: ['jobs', 'interviews'],
    queryFn: async () => {
      const res = await jobsApi.getMyInterviews();
      return res.interviews;
    },
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: jobsApi.submitFeedback,
  });
}

export function useEmployerJobListings() {
  return useQuery({
    queryKey: ['jobs', 'employerListings'],
    queryFn: async () => {
      const res = await jobsApi.getEmployerJobListings();
      return res.listings;
    },
  });
}

export function useCreateJobListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.createJobListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'employerListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'adminListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'stats'] });
    },
  });
}

export function useUpdateJobListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<jobsApi.JobListingApi> }) =>
      jobsApi.patchJobListing(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listing', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'employerListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'adminListings'] });
    },
  });
}

export function useDeleteJobListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.deleteJobListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'employerListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'adminListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'stats'] });
    },
  });
}

export function useEmployerApplications(params?: Parameters<typeof jobsApi.getEmployerApplications>[0]) {
  return useQuery({
    queryKey: ['jobs', 'employerApplications', params],
    queryFn: () => jobsApi.getEmployerApplications(params),
  });
}

export function useReviewApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: jobsApi.JobApplicationStatus; notes?: string }) =>
      jobsApi.reviewApplication(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'employerApplications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'stats'] });
    },
  });
}

export function useMakeJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.makeJobOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'employerOffers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'offers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'stats'] });
    },
  });
}

export function useEmployerOffers() {
  return useQuery({
    queryKey: ['jobs', 'employerOffers'],
    queryFn: async () => {
      const res = await jobsApi.getEmployerOffers();
      return res.offers;
    },
  });
}

export function useAdminJobListings(params?: Parameters<typeof jobsApi.getAdminJobListings>[0]) {
  return useQuery({
    queryKey: ['jobs', 'adminListings', params],
    queryFn: () => jobsApi.getAdminJobListings(params),
  });
}

export function useModerateJobListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      jobsApi.moderateJobListing(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'listing', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'adminListings'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'stats'] });
    },
  });
}

export function useJobPortalStats() {
  return useQuery({
    queryKey: ['jobs', 'stats'],
    queryFn: async () => {
      const res = await jobsApi.getJobPortalStats();
      return res.stats;
    },
  });
}
