import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { authAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useAssigneesQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.assignees(),
    queryFn: async () => {
      const res = await authAPI.getAssignees();
      return unwrapData(res);
    },
    ...options,
  });
};
