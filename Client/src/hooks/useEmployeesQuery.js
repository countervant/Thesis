import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { employeeAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useEmployeesQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.employees(params),
    queryFn: async () => {
      const res = await employeeAPI.getAll(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useEmployeeMutations = () => {
  const queryClient = useQueryClient();

  const invalidateEmployeeData = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignees() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
  };

  const createEmployee = useMutation({
    mutationFn: (employee) => employeeAPI.create(employee),
    onSuccess: () => invalidateEmployeeData(),
  });

  const updateEmployee = useMutation({
    mutationFn: ({ id, employee }) => employeeAPI.update(id, employee),
    onSuccess: () => invalidateEmployeeData(),
  });

  const deleteEmployee = useMutation({
    mutationFn: (id) => employeeAPI.delete(id),
    onSuccess: () => invalidateEmployeeData(),
  });

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    invalidateEmployeeData,
  };
};
