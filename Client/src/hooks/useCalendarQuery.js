import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { calendarAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useCalendarQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.calendar(params),
    queryFn: async () => {
      const res = await calendarAPI.getAll(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useCalendarDepartmentsQuery = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.calendarDepartments(),
    queryFn: async () => {
      const res = await calendarAPI.getDepartments();
      return unwrapData(res);
    },
    ...options,
  });
};

export const useCalendarMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCalendarData = () => {
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
  };

  const createEvent = useMutation({
    mutationFn: (event) => calendarAPI.create(event),
    onSuccess: () => invalidateCalendarData(),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, event }) => calendarAPI.update(id, event),
    onSuccess: () => invalidateCalendarData(),
  });

  const deleteEvent = useMutation({
    mutationFn: (id) => calendarAPI.delete(id),
    onSuccess: () => invalidateCalendarData(),
  });

  const createDepartment = useMutation({
    mutationFn: (department) => calendarAPI.createDepartment(department),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.calendarDepartments(),
      });
    },
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    createDepartment,
    invalidateCalendarData,
  };
};
