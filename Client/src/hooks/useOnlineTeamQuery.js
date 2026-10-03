import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { authAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useOnlineTeamQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.onlineTeam(),
    queryFn: async () => {
      const res = await authAPI.getOnlineTeam();
      return unwrapData(res);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    ...options,
  });
};
