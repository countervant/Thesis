import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { budgetAPI, budgetPlannerAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

const getBudgetType = (dataAPI) =>
  dataAPI === budgetPlannerAPI ? "planner" : "admin";

export const useBudgetQuery = (
  dataAPI = budgetAPI,
  params = {},
  options = {}
) => {
  const type = getBudgetType(dataAPI);

  return useQuery({
    queryKey: QUERY_KEYS.budget(type, params),
    queryFn: async () => {
      const res = await dataAPI.getAll(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useBudgetMutations = (dataAPI = budgetAPI) => {
  const queryClient = useQueryClient();
  const type = getBudgetType(dataAPI);

  const invalidateBudgetData = () => {
    queryClient.invalidateQueries({ queryKey: ["budget"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
  };

  const createEntry = useMutation({
    mutationFn: (entry) => dataAPI.create(entry),
    onSuccess: () => invalidateBudgetData(),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, entry }) => dataAPI.update(id, entry),
    onSuccess: () => invalidateBudgetData(),
  });

  const deleteEntry = useMutation({
    mutationFn: (id) => dataAPI.delete(id),
    onSuccess: () => invalidateBudgetData(),
  });

  return {
    type,
    createEntry,
    updateEntry,
    deleteEntry,
    invalidateBudgetData,
  };
};
