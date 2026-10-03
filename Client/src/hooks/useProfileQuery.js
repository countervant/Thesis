import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { authAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useProfileQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.profile(),
    queryFn: async () => {
      const res = await authAPI.getMe();
      const data = unwrapData(res);
      const profileId = data?._id || data?.id;
      if (profileId) {
        try {
          const publicRes = await authAPI.getPublicProfile(profileId, { refresh: true });
          const publicData = unwrapData(publicRes);
          return { ...data, ...publicData };
        } catch {
          return data;
        }
      }
      return data;
    },
    ...options,
  });
};

export const usePublicProfileQuery = (userId, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.publicProfile(userId),
    queryFn: async () => {
      const res = await authAPI.getPublicProfile(userId, options);
      return unwrapData(res);
    },
    enabled: Boolean(userId) && (options.enabled ?? true),
    ...options,
  });
};

export const useProfileMutations = () => {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: (profile) => authAPI.updateMe(profile),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignees() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onlineTeam() });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      const id = data?._id || data?.id;
      if (id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.publicProfile(id),
        });
      }
    },
  });

  return {
    updateProfile,
  };
};
