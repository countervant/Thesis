import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { taskAllocationAPI, chatProjectAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

/**
 * Preview Hungarian algorithm task allocation.
 * Only executes when the modal is open (enabled: Boolean(isOpen)).
 */
export const useAllocationPreviewQuery = ({
  projectId = null,
  payload = {},
  isOpen = true,
  enabled,
  ...options
} = {}) => {
  const isQueryEnabled =
    Boolean(isOpen) && (enabled !== undefined ? enabled : true);

  return useQuery({
    queryKey: QUERY_KEYS.allocationPreview(projectId, payload),
    queryFn: async () => {
      const res = await taskAllocationAPI.previewAllocation(
        projectId || "",
        payload
      );
      return unwrapData(res);
    },
    enabled: isQueryEnabled,
    staleTime: 0,
    ...options,
  });
};

/**
 * Commit allocation mutation
 */
export const useAllocationMutations = () => {
  const queryClient = useQueryClient();

  const commitAllocation = useMutation({
    mutationFn: ({ projectId, payload }) =>
      taskAllocationAPI.commitAllocation(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
    },
  });

  return { commitAllocation };
};

/**
 * Extract project draft from chat extraction endpoint.
 * Only executes when the modal is open and conversationId is present.
 */
export const useChatExtractPreviewQuery = ({
  conversationId = null,
  isOpen = true,
  enabled,
  ...options
} = {}) => {
  const isQueryEnabled =
    Boolean(isOpen && conversationId) &&
    (enabled !== undefined ? enabled : true);

  return useQuery({
    queryKey: QUERY_KEYS.chatExtractPreview(conversationId),
    queryFn: async () => {
      const response = await chatProjectAPI.extractPreview(conversationId);
      return unwrapData(response);
    },
    enabled: isQueryEnabled,
    staleTime: 0,
    ...options,
  });
};

/**
 * Commit extracted project and backlog tasks from chat conversation.
 */
export const useCommitChatProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, payload }) => {
      const response = await chatProjectAPI.commitProject(conversationId, payload);
      return unwrapData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["client-projects"] });
    },
  });
};
