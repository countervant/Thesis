import LeaveRequest from "../models/leaveRequestModel.js";

const MANILA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

export const getManilaDayRange = (date = new Date()) => {
  const manilaDate = new Date(date.getTime() + MANILA_UTC_OFFSET_MS);
  const start = new Date(Date.UTC(
    manilaDate.getUTCFullYear(),
    manilaDate.getUTCMonth(),
    manilaDate.getUTCDate()
  ));

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
};

export const getEmployeesOnApprovedLeave = async (employeeIds, date = new Date()) => {
  const uniqueEmployeeIds = [
    ...new Set(
      (employeeIds || [])
        .map((employeeId) => String(employeeId?._id || employeeId?.id || employeeId || ""))
        .filter(Boolean)
    ),
  ];

  if (uniqueEmployeeIds.length === 0) return [];

  const dayRange = getManilaDayRange(date);
  const leaveRequests = await LeaveRequest.find({
    employee: { $in: uniqueEmployeeIds },
    status: "Approved",
    startDate: { $lt: dayRange.end },
    endDate: { $gte: dayRange.start },
  })
    .select("employee employeeName leaveType startDate endDate")
    .sort({ endDate: -1 })
    .maxTimeMS(8000)
    .lean();

  const leaveByEmployee = new Map();
  leaveRequests.forEach((leaveRequest) => {
    const employeeId = String(leaveRequest.employee || "");
    if (employeeId && !leaveByEmployee.has(employeeId)) {
      leaveByEmployee.set(employeeId, leaveRequest);
    }
  });

  return [...leaveByEmployee.values()];
};
