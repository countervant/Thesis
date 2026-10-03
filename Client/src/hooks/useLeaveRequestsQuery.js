import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { leaveRequestAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useLeaveRequestsQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.leaveRequests(params),
    queryFn: async () => {
      const res = await leaveRequestAPI.getAll(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useLeaveRequestMutations = () => {
  const queryClient = useQueryClient();

  const invalidateLeaveData = () => {
    queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
  };

  const createRequest = useMutation({
    mutationFn: (request) => leaveRequestAPI.create(request),
    onSuccess: () => invalidateLeaveData(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, comment }) =>
      leaveRequestAPI.updateStatus(id, status, comment),
    onSuccess: () => invalidateLeaveData(),
  });

  const addComment = useMutation({
    mutationFn: ({ id, text }) => leaveRequestAPI.comment(id, text),
    onSuccess: () => invalidateLeaveData(),
  });

  const deleteRequest = useMutation({
    mutationFn: (id) => leaveRequestAPI.delete(id),
    onSuccess: () => invalidateLeaveData(),
  });

  return {
    createRequest,
    updateStatus,
    addComment,
    deleteRequest,
    invalidateLeaveData,
  };
};
