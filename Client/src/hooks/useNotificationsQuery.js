import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { messageAPI, newsfeedAPI, taskAPI } from "../services/api.js";

export const useNotificationsQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.notifications(),
    queryFn: async () => {
      const [postsResult, tasksResult] = await Promise.allSettled([
        newsfeedAPI.getActivity(),
        taskAPI.getAll({ limit: 50, view: "notification" }),
      ]);
      const posts = postsResult.status === "fulfilled" ? postsResult.value : [];
      const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
      return {
        posts: Array.isArray(posts) ? posts : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        hasError: postsResult.status === "rejected" || tasksResult.status === "rejected",
      };
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    ...options,
  });
};

export const useUnreadMessagesQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.unreadMessages(),
    queryFn: async () => {
      const count = await messageAPI.getUnreadCount();
      return typeof count === "number" ? count : 0;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    ...options,
  });
};

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
  };

  const markNotificationRead = useMutation({
    mutationFn: async (notificationId) => notificationId,
    onSuccess: () => {
      invalidateNotifications();
    },
  });

  const clearNotifications = useMutation({
    mutationFn: async () => true,
    onSuccess: () => {
      invalidateNotifications();
    },
  });

  return {
    invalidateNotifications,
    markNotificationRead,
    clearNotifications,
  };
};
