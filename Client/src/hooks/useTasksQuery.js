import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { taskAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useTasksQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.tasks(params),
    queryFn: async () => {
      const res = await taskAPI.getAll({ ...params, refresh: true });
      return unwrapData(res);
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    ...options,
  });
};

export const useTaskDetailsQuery = (taskId, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.taskDetails(taskId),
    queryFn: async () => {
      const res = await taskAPI.getById(taskId, { ...options, refresh: true });
      return unwrapData(res);
    },
    enabled: Boolean(taskId) && (options.enabled ?? true),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    ...options,
  });
};

export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const invalidateTaskData = (taskId) => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
    queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
    if (taskId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.taskDetails(taskId),
      });
    }
  };

  const createTask = useMutation({
    mutationFn: (task) => taskAPI.create(task),
    onSuccess: () => invalidateTaskData(),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, task }) => taskAPI.update(id, task),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => taskAPI.delete(id),
    onSuccess: (_, id) => invalidateTaskData(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => taskAPI.updateStatus(id, status),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const updateSubtask = useMutation({
    mutationFn: ({ taskId, subtaskId, completed }) =>
      taskAPI.updateSubtask(taskId, subtaskId, completed),
    onSuccess: (_, variables) => invalidateTaskData(variables?.taskId),
  });

  const submitOutput = useMutation({
    mutationFn: ({ id, output }) => taskAPI.submitOutput(id, output),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const requestRevision = useMutation({
    mutationFn: ({ id, revision }) => taskAPI.requestRevision(id, revision),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const approveTask = useMutation({
    mutationFn: (id) => taskAPI.approve(id),
    onSuccess: (_, id) => invalidateTaskData(id),
  });

  const setArchived = useMutation({
    mutationFn: ({ id, archived }) => taskAPI.setArchived(id, archived),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const setNewsfeedPermission = useMutation({
    mutationFn: ({ id, allowed }) => taskAPI.setNewsfeedPermission(id, allowed),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const submitFeedback = useMutation({
    mutationFn: ({ id, feedback }) => taskAPI.submitFeedback(id, feedback),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  const deleteFeedback = useMutation({
    mutationFn: (id) => taskAPI.deleteFeedback(id),
    onSuccess: (_, id) => invalidateTaskData(id),
  });

  const replyToFeedback = useMutation({
    mutationFn: ({ id, message }) => taskAPI.replyToFeedback(id, message),
    onSuccess: (_, variables) => invalidateTaskData(variables?.id),
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
    updateSubtask,
    submitOutput,
    requestRevision,
    approveTask,
    setArchived,
    setNewsfeedPermission,
    submitFeedback,
    deleteFeedback,
    replyToFeedback,
    invalidateTaskData,
  };
};
