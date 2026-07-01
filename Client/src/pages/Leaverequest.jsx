import { useCallback, useEffect, useMemo, useState } from "react";
import pendingrequest from "../assets/pendingrequest.png";
import done from "../assets/done.png";
import reject from "../assets/reject.png";
import employees from "../assets/employees.png";
import view from "../assets/view.png";
import check from "../assets/check.png";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { getApiErrorMessage, leaveRequestAPI } from "../services/api";

const toneStyles = {
  orange: "bg-orange-50 text-orange-500 ring-orange-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  rose: "bg-red-50 text-red-600 ring-red-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
};

const statCardStyles = {
  orange: "!border-[#ff8317]/45 border-b-2 !border-b-[#ff8317] ring-1 !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  green: "!border-[#28b84c]/45 border-b-2 !border-b-[#28b84c] ring-1 !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  rose: "!border-[#dc2626]/45 border-b-2 !border-b-[#dc2626] ring-1 !ring-[#dc2626]/20 dark:!border-[#dc2626] dark:!border-b-[#dc2626] dark:!ring-[#dc2626]/45",
  pink: "!border-[#e347a8]/45 border-b-2 !border-b-[#e347a8] ring-1 !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
};

const statusStyles = {
  Pending: "bg-orange-50 text-orange-600 ring-orange-100",
  Approved: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Rejected: "bg-red-50 text-red-600 ring-red-100",
};

const typeColors = {
  "Vacation Leave": "bg-emerald-100 text-emerald-700",
  "Sick Leave": "bg-rose-100 text-rose-700",
  "Emergency Leave": "bg-sky-100 text-sky-700",
  Others: "bg-pink-100 text-pink-700",
};

const ImageIcon = ({ src, alt = "", className = "h-5 w-5" }) => (
  <img
    src={src}
    alt={alt}
    className={`${className} object-contain`}
    aria-hidden={alt ? undefined : "true"}
  />
);

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.16),0_8px_24px_rgba(190,65,158,0.05)] ${className}`}>
    {children}
  </section>
);

const StatusPill = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statusStyles[status] || statusStyles.Pending}`}>
    {status}
  </span>
);

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "LR";

const getDisplayName = (profile) =>
  [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
  profile?.companyName ||
  profile?.email ||
  "User";

const Avatar = ({ initials, name, size = "h-10 w-10", user }) => (
  <InitialsAvatar
    alt={name}
    className={size}
    fallback={initials || "LR"}
    initials={initials}
    name={name}
    textClassName={size.includes("h-24") ? "text-2xl" : "text-sm"}
    user={user}
  />
);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateWithWeekday = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatMonth = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const formatDates = (request) => {
  const start = formatDate(request?.startDate);
  const end = formatDate(request?.endDate);
  return start === end ? start : `${start} - ${end}`;
};

const getRequestId = (request) => request?._id || request?.id || "";

const normalizeRequest = (request) => ({
  ...request,
  id: request.requestCode || getRequestId(request),
  employee: request.employeeName || "Employee",
  employeeProfile: typeof request.employee === "object" ? request.employee : null,
  initials: getInitials(request.employeeName),
  role: request.employeeRole || request.employee?.position || request.employee?.role || "Employee",
  type: request.leaveType || "Others",
  dates: formatDates(request),
  duration: `${request.durationDays || 1} ${Number(request.durationDays) === 1 ? "day" : "days"}`,
  department: request.department || "Unassigned",
  status: request.status || "Pending",
});

const DetailIcon = ({ name }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-4 w-4",
    "aria-hidden": "true",
  };

  if (name === "calendar") {
    return (
      <svg {...props}>
        <rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.5 19c.8-3.8 3-5.8 6.5-5.8s5.7 2 6.5 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "briefcase") {
    return (
      <svg {...props}>
        <path d="M9 7V5h6v2M5 8h14v11H5zM5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...props}>
        <path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "attachment") {
    return (
      <svg {...props}>
        <path d="m9 12 4.8-4.8a3 3 0 1 1 4.2 4.2l-6.5 6.5a4 4 0 0 1-5.7-5.7l6.2-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};

const DetailSection = ({ children, icon, title }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-pink-500">
        <DetailIcon name={icon} />
      </span>
      <h3 className="text-sm font-black text-[#111936]">{title}</h3>
    </div>
    {children}
  </section>
);

const DetailLine = ({ icon, label, value }) => (
  <div className="grid grid-cols-[28px_1fr_1.25fr] items-center gap-3 border-b border-slate-100 py-3 text-xs last:border-b-0">
    <span className="grid h-7 w-7 place-items-center rounded-md bg-pink-50 text-pink-500">
      <DetailIcon name={icon} />
    </span>
    <span className="font-bold text-slate-500">{label}</span>
    <span className="font-black text-[#111936]">{value || "-"}</span>
  </div>
);

const getMonthDate = (monthFilter) => {
  const now = new Date();
  if (monthFilter === "last") {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const monthMatches = (request, monthDate) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  return start < monthEnd && end >= monthStart;
};

const LeaveRequest = () => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const tabs = ["All", "Pending", "Approved", "Rejected"];
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("this");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [detailRequestId, setDetailRequestId] = useState("");
  const [commentText, setCommentText] = useState("");

  const loadLeaveRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const params = {
        limit: 100,
        month: monthFilter,
      };

      if (statusFilter !== "All") params.status = statusFilter;
      if (departmentFilter) params.department = departmentFilter;

      const response = await leaveRequestAPI.getAll(params);
      setRequests(response.leaveRequests.map(normalizeRequest));
      setDepartments(response.departments || []);
      setSummary(response.summary || {});
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to load leave requests."));
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter, monthFilter, statusFilter]);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  useEffect(() => {
    if (requests.length === 0) {
      setSelectedRequestId("");
      return;
    }

    if (!requests.some((request) => getRequestId(request) === selectedRequestId)) {
      setSelectedRequestId(getRequestId(requests[0]));
    }
  }, [requests, selectedRequestId]);

  const selectedRequest =
    requests.find((request) => getRequestId(request) === selectedRequestId) || requests[0] || null;
  const detailRequest =
    requests.find((request) => getRequestId(request) === detailRequestId) || null;

  const summaryCards = useMemo(
    () => [
      { label: "Pending Requests", value: summary.pending || 0, tone: "orange", icon: pendingrequest },
      { label: "Approved This Month", value: summary.approvedThisMonth || 0, tone: "green", icon: done },
      { label: "Rejected", value: summary.rejected || 0, tone: "rose", icon: reject },
      { label: "Employees On Leave", value: summary.onLeaveToday || 0, tone: "pink", icon: employees },
    ],
    [summary]
  );

  const monthDate = getMonthDate(monthFilter);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDayOffset = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const calendarCells = Math.ceil((daysInMonth + firstDayOffset) / 7) * 7;
  const days = Array.from({ length: calendarCells }, (_, index) => index - firstDayOffset + 1);

  const calendarEvents = useMemo(
    () =>
      requests
        .filter((request) => ["Approved", "Pending"].includes(request.status))
        .filter((request) => monthMatches(request, monthDate))
        .flatMap((request) => {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          const startDay =
            start.getMonth() === monthDate.getMonth() && start.getFullYear() === monthDate.getFullYear()
              ? start.getDate()
              : 1;
          const endDay =
            end.getMonth() === monthDate.getMonth() && end.getFullYear() === monthDate.getFullYear()
              ? end.getDate()
              : daysInMonth;

          return Array.from({ length: endDay - startDay + 1 }, (_, index) => ({
            day: startDay + index,
            label: `${request.employee.split(" ")[0]} (${request.type.split(" ")[0][0]}L)`,
            color: typeColors[request.type] || typeColors.Others,
          }));
        }),
    [daysInMonth, monthDate, requests]
  );

  const historyItems = useMemo(
    () => requests.filter((request) => request.status !== "Pending").slice(0, 5),
    [requests]
  );

  const leaveTypeStats = useMemo(() => {
    const total = (summary.byType || []).reduce((sum, item) => sum + item.count, 0);
    const fallback = ["Vacation Leave", "Sick Leave", "Emergency Leave", "Others"];
    const items = (summary.byType?.length ? summary.byType.map((item) => item._id) : fallback).map((type) => {
      const count = summary.byType?.find((item) => item._id === type)?.count || 0;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { type, count, percent };
    });

    return { total, items };
  }, [summary.byType]);

  const updateRequestInState = (updatedRequest) => {
    const normalizedRequest = normalizeRequest(updatedRequest);
    const requestId = getRequestId(normalizedRequest);
    setRequests((currentRequests) =>
      currentRequests.map((item) => (getRequestId(item) === requestId ? normalizedRequest : item))
    );
    setSelectedRequestId(requestId);
    setDetailRequestId((currentId) => (currentId === requestId ? requestId : currentId));
  };

  const handleStatusUpdate = async (request, status, comment = "") => {
    const requestId = getRequestId(request);
    if (!requestId || request.status !== "Pending" || busyRequestId) return;

    try {
      setBusyRequestId(requestId);
      setErrorMessage("");
      const updatedRequest = await leaveRequestAPI.updateStatus(requestId, status, comment);
      updateRequestInState(updatedRequest);
      if (comment) setCommentText("");
      await loadLeaveRequests();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Unable to ${status.toLowerCase()} leave request.`));
    } finally {
      setBusyRequestId("");
    }
  };

  const openRequestDetails = (request) => {
    const requestId = getRequestId(request);
    setSelectedRequestId(requestId);
    setDetailRequestId(requestId);
  };

  const handleAddComment = async (request) => {
    const requestId = getRequestId(request);
    const text = commentText.trim();
    if (!requestId || !text || busyRequestId) return;

    try {
      setBusyRequestId(requestId);
      setErrorMessage("");
      const updatedRequest = await leaveRequestAPI.comment(requestId, text);
      updateRequestInState(updatedRequest);
      setCommentText("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to add comment."));
    } finally {
      setBusyRequestId("");
    }
  };

  return (
    <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] space-y-4 bg-[#f8f9fd] px-4 py-4 text-[#111936] md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-black tracking-tight text-[#10142d]"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Leave Requests
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Manage and review employee leave requests.
          </p>
        </div>
      </header>

      {errorMessage && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`p-4 !shadow-sm dark:!shadow-none ${statCardStyles[card.tone]}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneStyles[card.tone]}`}>
                <ImageIcon src={card.icon} className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-slate-600">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-[#10142d]">{card.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-50 px-5 py-4">
            <h2 className="text-base font-black">Leave Requests</h2>
            <div className="flex flex-wrap gap-3">
              <select
                className="h-10 rounded-xl border border-pink-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-xl border border-pink-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              >
                <option value="this">This Month</option>
                <option value="last">Last Month</option>
                <option value="all">All Months</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${statusFilter === tab ? "bg-pink-100 text-pink-700 shadow-sm" : "border border-pink-100 bg-white text-slate-600 hover:bg-pink-50"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto px-5 py-4">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="text-xs font-black uppercase text-slate-400">
                <tr>
                  {["Request ID", "Employee", "Leave Type", "Dates", "Duration", "Department", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-3 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {isLoading && (
                  <tr>
                    <td colSpan="8" className="px-3 py-8 text-center font-bold text-slate-500">Loading leave requests...</td>
                  </tr>
                )}
                {!isLoading && requests.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-3 py-8 text-center font-bold text-slate-500">No leave requests found.</td>
                  </tr>
                )}
                {!isLoading && requests.map((request) => (
                  <tr key={getRequestId(request)} className="hover:bg-pink-50/40">
                    <td className="px-3 py-3 font-black text-pink-700">{request.id}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={request.initials} name={request.employee} user={request.employeeProfile} />
                        <span>
                          <span className="block font-black">{request.employee}</span>
                          <span className="text-xs font-semibold text-slate-500">{request.role}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">{request.type}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{request.dates}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{request.duration}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{request.department}</td>
                    <td className="px-3 py-3"><StatusPill status={request.status} /></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(request, "Approved")}
                          disabled={request.status !== "Pending" || busyRequestId === getRequestId(request)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Approve"
                        >
                          <ImageIcon src={check} className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(request, "Rejected")}
                          disabled={request.status !== "Pending" || busyRequestId === getRequestId(request)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Reject"
                        >
                          <ImageIcon src={reject} className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openRequestDetails(request)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-pink-50"
                          aria-label="View details"
                        >
                          <ImageIcon src={view} className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="order-2 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Team Leave Calendar</h2>
              <span className="text-sm font-black text-pink-600">{monthFilter === "all" ? "All Months" : formatMonth(monthDate)}</span>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">
              {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {days.map((day, index) => (
                <div key={`${day}-${index}`} className={`relative h-16 rounded-xl border border-pink-50 bg-white text-sm font-black ${day < 1 || day > daysInMonth ? "text-slate-300" : "text-[#111936]"}`}>
                  <span className="absolute left-2 top-2">{day < 1 ? "" : day > daysInMonth ? "" : day}</span>
                  {calendarEvents.filter((event) => event.day === day).slice(0, 1).map((event) => (
                    <div key={event.label} className={`absolute bottom-2 left-1 right-1 truncate rounded-full px-2 py-1 text-[10px] font-black ${event.color}`}>
                      {event.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
              {["Vacation Leave", "Sick Leave", "Emergency Leave", "Others"].map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${["bg-emerald-500", "bg-rose-500", "bg-sky-500", "bg-pink-500"][index]}`} />
                  {item}
                </span>
              ))}
            </div>
          </Card>

          <Card className="order-1 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black">Request Details</h2>
              {selectedRequest && <StatusPill status={selectedRequest.status} />}
            </div>
            {selectedRequest ? (
              <>
                <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="text-center">
                    <Avatar initials={selectedRequest.initials} name={selectedRequest.employee} size="mx-auto h-14 w-14" user={selectedRequest.employeeProfile} />
                    <p className="mt-3 text-base font-black">{selectedRequest.employee}</p>
                    <p className="text-sm font-bold text-slate-500">{selectedRequest.role}</p>
                    <p className="text-sm font-bold text-slate-500">{selectedRequest.department}</p>
                  </div>
                  <div className="grid gap-3 text-sm font-bold text-slate-600">
                    <p><span className="text-slate-400">Leave dates:</span> {selectedRequest.dates}</p>
                    <p><span className="text-slate-400">Duration:</span> {selectedRequest.duration}</p>
                    <p><span className="text-slate-400">Leave type:</span> {selectedRequest.type}</p>
                    <p><span className="text-slate-400">Reason:</span> {selectedRequest.reason}</p>
                    <p><span className="text-slate-400">Emergency contact:</span> {selectedRequest.emergencyContact || "-"}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedRequest, "Approved")}
                    disabled={selectedRequest.status !== "Pending" || busyRequestId === getRequestId(selectedRequest)}
                    className="h-10 rounded-xl bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedRequest, "Rejected")}
                    disabled={selectedRequest.status !== "Pending" || busyRequestId === getRequestId(selectedRequest)}
                    className="h-10 rounded-xl bg-rose-500 text-xs font-black text-white shadow-lg shadow-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => openRequestDetails(selectedRequest)}
                    className="h-10 rounded-xl border border-pink-300 bg-white text-xs font-black text-pink-700"
                  >
                    View Details
                  </button>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm font-bold text-slate-500">Select a request to view details.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4">
            <h2 className="text-lg font-black">Leave Analytics</h2>
            <select
              className="h-9 rounded-xl border border-pink-100 bg-white px-4 text-xs font-bold text-slate-700 outline-none"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
              <option value="all">All Months</option>
            </select>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr_0.62fr]">
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[140px_1fr]">
              <div>
                <p className="mb-3 text-sm font-black">Leave by Type</p>
                <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: "conic-gradient(#10b867 0 51%, #f53b98 51% 75%, #1e9de8 75% 90%, #ec4899 90% 100%)" }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-sm">
                    <span className="text-2xl font-black leading-none">{leaveTypeStats.total}<span className="mt-1 block text-xs text-slate-500">Total</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full space-y-3 text-xs font-bold">
                  {leaveTypeStats.items.map((item, index) => (
                    <p key={item.type} className="grid grid-cols-[1fr_auto] items-center gap-5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className={`h-2.5 w-2.5 rounded-full ${["bg-emerald-500", "bg-pink-500", "bg-sky-500", "bg-pink-500"][index % 4]}`} />
                        {item.type.replace(" Leave", "")}
                      </span>
                      <span className="text-[#111936]">{item.count} ({item.percent}%)</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-y border-pink-50 px-5 py-5 lg:border-x lg:border-y-0">
              <p className="mb-4 text-sm font-black">Most Used Leave Type</p>
              {leaveTypeStats.items.map((item, index) => (
                <div key={item.type} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs font-black text-slate-500">
                    <span>{item.type}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-pink-50">
                    <div className={`h-3 rounded-full ${["bg-emerald-500", "bg-pink-500", "bg-sky-500", "bg-pink-500"][index % 4]}`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center px-5 py-5 text-center">
              <p className="mb-4 text-sm font-black">Employees on Leave Today</p>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-pink-100">
                <ImageIcon src={employees} className="h-9 w-9" />
              </div>
              <p className="mt-3 text-3xl font-black">{summary.onLeaveToday || 0}</p>
              <p className="text-xs font-bold text-slate-500">employees</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-base font-black">Recent Leave History</h2>
            <button type="button" onClick={() => setStatusFilter("All")} className="text-sm font-black text-pink-600">View all</button>
          </div>
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs font-black uppercase text-slate-400">
                <tr>
                  {["Employee", "Leave Type", "Dates", "Duration", "Status"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {historyItems.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-8 text-center text-sm font-bold text-slate-500">No approved or rejected requests yet.</td>
                  </tr>
                )}
                {historyItems.map((item) => (
                  <tr key={getRequestId(item)}>
                    <td className="px-3 py-4 font-black">{item.employee}</td>
                    <td className="px-3 py-4 font-bold text-slate-600">{item.type}</td>
                    <td className="px-3 py-4 font-bold text-slate-600">{item.dates}</td>
                    <td className="px-3 py-4 font-bold text-slate-600">{item.duration}</td>
                    <td className="px-3 py-4"><StatusPill status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {detailRequest && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-6 text-[#111936] shadow-2xl ring-1 ring-slate-200">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-pink-50 text-pink-500">
                  <DetailIcon name="calendar" />
                </span>
                <div>
                  <h2 className="text-xl font-black">Leave Request Details</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    View and manage the details of this leave request.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={detailRequest.status} />
                <button
                  type="button"
                  onClick={() => setDetailRequestId("")}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close leave request details"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection icon="user" title="Employee Information">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <Avatar
                    initials={detailRequest.initials}
                    name={detailRequest.employee}
                    size="h-24 w-24 text-2xl"
                    user={detailRequest.employeeProfile}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black">{detailRequest.employee}</p>
                    <p className="text-sm font-bold text-slate-500">{detailRequest.role}</p>
                    <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600">
                      <p className="grid grid-cols-[24px_100px_1fr] items-center gap-2">
                        <DetailIcon name="briefcase" />
                        <span>Department</span>
                        <span className="font-black text-[#111936]">{detailRequest.department}</span>
                      </p>
                      <p className="grid grid-cols-[24px_100px_1fr] items-center gap-2">
                        <DetailIcon name="user" />
                        <span>Position</span>
                        <span className="font-black text-[#111936]">{detailRequest.role}</span>
                      </p>
                      <p className="grid grid-cols-[24px_100px_1fr] items-center gap-2">
                        <DetailIcon name="time" />
                        <span>Request ID</span>
                        <span className="font-black text-[#111936]">{detailRequest.id}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </DetailSection>

              <DetailSection icon="calendar" title="Request Information">
                <DetailLine icon="calendar" label="Leave Type" value={detailRequest.type} />
                <DetailLine icon="calendar" label="Start Date" value={formatDateWithWeekday(detailRequest.startDate)} />
                <DetailLine icon="calendar" label="End Date" value={formatDateWithWeekday(detailRequest.endDate)} />
                <DetailLine icon="time" label="Total Days" value={detailRequest.duration} />
                <DetailLine icon="calendar" label="Submitted Date" value={formatDateTime(detailRequest.createdAt)} />
                <DetailLine icon="message" label="Reason" value={detailRequest.reason} />
              </DetailSection>

              <DetailSection icon="time" title="Leave Timeline">
                <div className="space-y-0">
                  {[
                    {
                      label: "Request Submitted",
                      date: formatDateTime(detailRequest.createdAt),
                      complete: true,
                    },
                    {
                      label: "Under Review",
                      date: detailRequest.reviewedAt ? formatDateTime(detailRequest.reviewedAt) : "Waiting for review",
                      complete: detailRequest.status !== "Pending",
                    },
                    ...(detailRequest.status === "Pending"
                      ? []
                      : [
                          {
                            label: detailRequest.status === "Rejected" ? "Rejected" : "Approved",
                            date: formatDateTime(detailRequest.reviewedAt || detailRequest.updatedAt),
                            complete: true,
                            rejected: detailRequest.status === "Rejected",
                          },
                        ]),
                  ].map((item, index, items) => (
                    <div key={item.label} className="grid grid-cols-[28px_1fr_auto] gap-3">
                      <span className="relative flex justify-center">
                        <span className={`mt-1 grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white ${
                          item.rejected ? "bg-rose-500" : item.complete ? "bg-emerald-500" : "bg-orange-500"
                        }`}>
                          {item.complete ? (item.rejected ? "x" : "✓") : ""}
                        </span>
                        {index < items.length - 1 && <span className="absolute top-7 h-full w-px bg-slate-200" />}
                      </span>
                      <span className="pb-5">
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-500">{item.date}</span>
                      </span>
                      <span className={`mt-0.5 h-fit rounded-full px-3 py-1 text-[11px] font-black ${
                        item.rejected ? "bg-rose-50 text-rose-600" : item.complete ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      }`}>
                        {item.rejected ? "Rejected" : item.complete ? "Completed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection icon="message" title="Comments">
                <div className="space-y-4">
                  {detailRequest.comments?.length > 0 ? (
                    detailRequest.comments.map((comment) => {
                      const authorName = getDisplayName(comment.author);

                      return (
                        <div key={comment._id || `${authorName}-${comment.createdAt}`} className="flex gap-3">
                          <Avatar
                            initials={getInitials(authorName)}
                            name={authorName}
                            size="h-11 w-11"
                            user={comment.author}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-black">
                                {authorName}
                                {comment.author?.role ? (
                                  <span className="ml-2 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-black uppercase text-pink-600">
                                    {comment.author.role}
                                  </span>
                                ) : null}
                              </p>
                              <span className="text-xs font-bold text-slate-400">{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-600">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
                      No comments yet.
                    </p>
                  )}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <label className="block">
                      <span className="sr-only">Add comment</span>
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Write a comment..."
                        className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                      />
                    </label>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddComment(detailRequest)}
                        disabled={!commentText.trim() || busyRequestId === getRequestId(detailRequest)}
                        className="h-9 rounded-xl bg-pink-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              </DetailSection>

            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setDetailRequestId("")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate(detailRequest, "Rejected", commentText.trim())}
                disabled={detailRequest.status !== "Pending" || busyRequestId === getRequestId(detailRequest)}
                className="h-11 rounded-xl border border-rose-200 bg-rose-50 px-8 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate(detailRequest, "Approved", commentText.trim())}
                disabled={detailRequest.status !== "Pending" || busyRequestId === getRequestId(detailRequest)}
                className="h-11 rounded-xl bg-emerald-500 px-8 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
