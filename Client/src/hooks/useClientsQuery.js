import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { clientAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useClientsQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.clients(params),
    queryFn: async () => {
      const res = await clientAPI.getAll(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useClientMutations = () => {
  const queryClient = useQueryClient();

  const invalidateClientData = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
  };

  const createClient = useMutation({
    mutationFn: (client) => clientAPI.create(client),
    onSuccess: () => invalidateClientData(),
  });

  const updateClient = useMutation({
    mutationFn: ({ id, client }) => clientAPI.update(id, client),
    onSuccess: () => invalidateClientData(),
  });

  const deleteClient = useMutation({
    mutationFn: (id) => clientAPI.delete(id),
    onSuccess: () => invalidateClientData(),
  });

  return {
    createClient,
    updateClient,
    deleteClient,
    invalidateClientData,
  };
};
