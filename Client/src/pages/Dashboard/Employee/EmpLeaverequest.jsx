import { useCallback, useEffect, useMemo, useState } from "react";
import check from "../../../assets/check.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import reject from "../../../assets/reject.png";
import InitialsAvatar from "../../../components/InitialsAvatar.jsx";
import { useAuth } from "../../../context/AuthContext";
import { getApiErrorMessage, leaveRequestAPI } from "../../../services/api";

const toneStyles = {
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
};

const statusStyles = {
  Approved: "bg-emerald-50 text-emerald-600",
  Pending: "bg-orange-50 text-orange-600",
  Rejected: "bg-rose-50 text-rose-600",
};

const leaveTypeColors = {
  "Emergency Leave": "bg-rose-50 text-rose-600",
  "Sick Leave": "bg-emerald-50 text-emerald-600",
  "Vacation Leave": "bg-emerald-50 text-emerald-600",
  Others: "bg-pink-50 text-pink-600",
};

const defaultForm = {
  leaveType: "Vacation Leave",
  startDate: "",
  endDate: "",
  reason: "",
  emergencyContact: "",
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white shadow-[0_3px_4px_rgba(190,65,158,0.35)] ${className}`}>
    {children}
  </section>
);

const ImageIcon = ({ src, className = "h-8 w-8" }) => (
  <img src={src} alt="" className={`${className} object-contain`} aria-hidden="true" />
);

const SmallIcon = ({ name, className = "h-4 w-4" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "person") return <svg {...props}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M5.5 19c.8-3.4 3-5.2 6.5-5.2s5.7 1.8 6.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "leave") return <svg {...props}><path d="M8 4h8M8 20h8M9 4c0 4.2 6 4.2 6 8s-6 3.8-6 8M15 4c0 4.2-6 4.2-6 8s6 3.8 6 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "time") return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "message") return <svg {...props}><path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyles[status] || statusStyles.Pending}`}>
    {status}
  </span>
);

const LeaveType = ({ type }) => (
  <span className="flex items-center gap-2 font-bold text-slate-700">
    <span className={`grid h-6 w-6 place-items-center rounded-md ${leaveTypeColors[type] || "bg-pink-50 text-pink-600"}`}>
      <SmallIcon name={type === "Emergency Leave" ? "person" : "leave"} className="h-3.5 w-3.5" />
    </span>
    {type}
  </span>
);

const getEntityId = (entity) => entity?._id || entity?.id || entity || "";

const getUserName = (profile) =>
  [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
  profile?.companyName ||
  profile?.email ||
  "Employee";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateWithWeekday = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    weekday: "short",
  });
};

const formatDates = (request) => {
  const start = formatDate(request?.startDate);
  const end = formatDate(request?.endDate);
  return start === end ? start : `${start} - ${end}`;
};

const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
};

const durationLabel = (days) => `${days || 0} ${Number(days) === 1 ? "day" : "days"}`;

const normalizeRequest = (request) => ({
  ...request,
  id: request.requestCode || getEntityId(request),
  type: request.leaveType || "Others",
  dates: formatDates(request),
  duration: durationLabel(request.durationDays || 1),
  status: request.status || "Pending",
  submitted: formatDateTime(request.createdAt),
  approvedBy: request.reviewedBy ? `${getUserName(request.reviewedBy)} (${request.reviewedBy.role || "Reviewer"})` : "-",
});

const DetailSection = ({ children, icon, title }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-pink-500">
        <SmallIcon name={icon} />
      </span>
      <h3 className="text-sm font-black text-[#111936]">{title}</h3>
    </div>
    {children}
  </section>
);

const DetailLine = ({ icon, label, value }) => (
  <div className="grid grid-cols-[28px_1fr_1.25fr] items-center gap-3 border-b border-slate-100 py-3 text-xs last:border-b-0">
    <span className="grid h-7 w-7 place-items-center rounded-md bg-pink-50 text-pink-500">
      <SmallIcon name={icon} />
    </span>
    <span className="font-bold text-slate-500">{label}</span>
    <span className="font-black text-[#111936]">{value || "-"}</span>
  </div>
);

const monthName = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const statusCalendarClass = {
  Approved: "bg-emerald-500 text-white",
  Pending: "bg-orange-50 text-orange-600",
  Rejected: "bg-pink-50 text-pink-600",
};

const Calendar = ({ currentMonth, onNextMonth, onPreviousMonth, requests }) => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const cells = Math.ceil((daysInMonth + firstDayOffset) / 7) * 7;
  const days = Array.from({ length: cells }, (_, index) => index - firstDayOffset + 1);
  const markedDays = requests.reduce((map, request) => {
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return map;

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    if (start > monthEnd || end < monthStart) return map;

    const first = start < monthStart ? 1 : start.getDate();
    const last = end > monthEnd ? daysInMonth : end.getDate();
    for (let day = first; day <= last; day += 1) {
      map[day] = statusCalendarClass[request.status] || "bg-orange-50 text-orange-600";
    }
    return map;
  }, {});

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black">Leave Calendar</h2>
        <div className="flex items-center gap-4 text-sm font-black text-[#10142d]">
          <button type="button" onClick={onPreviousMonth} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" aria-label="Previous month">
            <SmallIcon name="chevron" className="h-4 w-4 rotate-180" />
          </button>
          {monthName(currentMonth)}
          <button type="button" onClick={onNextMonth} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" aria-label="Next month">
            <SmallIcon name="chevron" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">
        {weekDays.map((day) => <span key={day} className="py-2">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const isMuted = day < 1 || day > daysInMonth;
          return (
            <div key={`${day}-${index}`} className="grid h-12 place-items-center text-sm font-black">
              <span className={`grid h-9 min-w-9 place-items-center rounded-full px-2 ${markedDays[day] || ""} ${isMuted ? "text-slate-300" : "text-[#10142d]"}`}>
                {isMuted ? "" : day}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-8 text-xs font-black text-slate-500">
        {[
          ["Approved", "bg-emerald-500"],
          ["Pending", "bg-orange-500"],
          ["Rejected", "bg-pink-500"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
};

const EmpLeaverequest = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    emergencyContact: user?.phone || "",
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [detailRequestId, setDetailRequestId] = useState("");
  const [commentText, setCommentText] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await leaveRequestAPI.getAll({ limit: 100, month: "all" });
      setRequests(response.leaveRequests.map(normalizeRequest));
      setSummary(response.summary || {});
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to load leave requests."));
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setForm((currentForm) => ({
      ...currentForm,
      emergencyContact: currentForm.emergencyContact || user?.phone || "",
    }));
  }, [user?.phone]);

  const formDuration = calculateDuration(form.startDate, form.endDate);

  const stats = useMemo(
    () => [
      { label: "Pending Requests", value: summary.pending || 0, icon: pendingrequest, tone: "orange" },
      { label: "Approved", value: summary.approved || 0, icon: check, tone: "green" },
      { label: "Rejected", value: summary.rejected || 0, icon: reject, tone: "rose" },
    ],
    [summary]
  );

  const filteredHistory = useMemo(
    () => requests.filter((request) => !statusFilter || request.status === statusFilter),
    [requests, statusFilter]
  );
  const detailRequest = requests.find((request) => getEntityId(request) === detailRequestId) || null;

  const updateRequestInState = (updatedRequest) => {
    const normalizedRequest = normalizeRequest(updatedRequest);
    const requestId = getEntityId(normalizedRequest);
    setRequests((currentRequests) =>
      currentRequests.map((item) => (getEntityId(item) === requestId ? normalizedRequest : item))
    );
    setDetailRequestId((currentId) => (currentId === requestId ? requestId : currentId));
  };

  const updateField = (field, value) => {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [field]: value };
      if (field === "startDate" && nextForm.endDate && value > nextForm.endDate) {
        nextForm.endDate = value;
      }
      return nextForm;
    });
  };

  const resetForm = () => {
    setForm({
      ...defaultForm,
      emergencyContact: user?.phone || "",
    });
    setMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!form.startDate || !form.endDate || !form.reason.trim() || !form.emergencyContact.trim()) {
      setErrorMessage("Please complete all required leave request fields.");
      return;
    }

    if (formDuration <= 0) {
      setErrorMessage("End date must be the same as or later than the start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      await leaveRequestAPI.create({
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        emergencyContact: form.emergencyContact,
      });
      setMessage("Leave request submitted.");
      setForm({
        ...defaultForm,
        emergencyContact: user?.phone || "",
      });
      await loadRequests();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit leave request."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const handleAddComment = async (request) => {
    const requestId = getEntityId(request);
    const text = commentText.trim();
    if (!requestId || !text) return;

    try {
      setErrorMessage("");
      const updatedRequest = await leaveRequestAPI.comment(requestId, text);
      updateRequestInState(updatedRequest);
      setCommentText("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to add comment."));
    }
  };

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header>
        <h1
          className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
          style={{ fontFamily: "var(--font-bruno)" }}
        >
          Leave Requests
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Request time off and track your leave status.
        </p>
      </header>

      {(errorMessage || message) && (
        <p className={`rounded-xl border px-4 py-3 text-sm font-bold ${errorMessage ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
          {errorMessage || message}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} className="p-6">
            <div className="flex items-center gap-8">
              <span className={`grid h-20 w-20 place-items-center rounded-2xl ring-1 ${toneStyles[item.tone]}`}>
                <ImageIcon src={item.icon} className="h-11 w-11" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-600">{item.label}</p>
                <p className="mt-2 text-4xl font-black text-[#10142d]">{item.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-5 text-xl font-black">Request Leave</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-600">Leave Type <span className="text-pink-500">*</span></span>
                <select
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                  value={form.leaveType}
                  onChange={(event) => updateField("leaveType", event.target.value)}
                >
                  <option>Vacation Leave</option>
                  <option>Sick Leave</option>
                  <option>Emergency Leave</option>
                  <option>Others</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-600">Start Date <span className="text-pink-500">*</span></span>
                <span className="relative block">
                  <input
                    type="date"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                  />
                  <SmallIcon name="calendar" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-600">End Date <span className="text-pink-500">*</span></span>
                <span className="relative block">
                  <input
                    type="date"
                    min={form.startDate || undefined}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                  />
                  <SmallIcon name="calendar" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-600">Total Duration</span>
                <input className="h-12 w-full rounded-xl border border-pink-100 bg-pink-50 px-4 text-sm font-black text-pink-700 outline-none" value={durationLabel(formDuration)} readOnly />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-black text-slate-600">Reason <span className="text-pink-500">*</span></span>
                <textarea
                  className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                  value={form.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-black text-slate-600">Emergency Contact <span className="text-pink-500">*</span></span>
                <span className="relative block">
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                    value={form.emergencyContact}
                    onChange={(event) => updateField("emergencyContact", event.target.value)}
                    placeholder="Name and phone number"
                  />
                  <SmallIcon name="person" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="h-12 rounded-xl border border-slate-200 bg-white px-9 text-sm font-black text-slate-600">Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-9 text-sm font-black text-white shadow-[0_4px_8px_rgba(219,74,181,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </Card>

        <Calendar
          currentMonth={currentMonth}
          onNextMonth={handleNextMonth}
          onPreviousMonth={handlePreviousMonth}
          requests={requests}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-5">
          <h2 className="text-xl font-black">Leave History</h2>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#10142d] outline-none"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-xs font-black uppercase text-slate-400">
              <tr>
                {["Request ID", "Leave Type", "Dates", "Duration", "Status", "Submitted On", "Approved By", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {isLoading && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-bold text-slate-500">Loading leave history...</td>
                </tr>
              )}
              {!isLoading && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-bold text-slate-500">No leave requests found.</td>
                </tr>
              )}
              {!isLoading && filteredHistory.map((item) => (
                <tr key={getEntityId(item)} className="hover:bg-pink-50/40">
                  <td className="px-3 py-4 font-black text-pink-700">{item.id}</td>
                  <td className="px-3 py-4"><LeaveType type={item.type} /></td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.dates}</td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.duration}</td>
                  <td className="px-3 py-4"><StatusPill status={item.status} /></td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.submitted}</td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.approvedBy}</td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailRequestId(getEntityId(item))}
                        className="h-9 rounded-lg border border-pink-100 bg-pink-50 px-3 text-xs font-black text-pink-700 hover:bg-pink-100"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(new Date(new Date(item.startDate).getFullYear(), new Date(item.startDate).getMonth(), 1));
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-pink-50"
                        aria-label={`View ${item.id} on calendar`}
                      >
                        <SmallIcon name="calendar" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-pink-50 px-5 py-4 text-sm font-black text-slate-500">
          <span>{filteredHistory.length} of {requests.length} requests</span>
        </div>
      </Card>

      {detailRequest && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 text-[#111936] shadow-2xl ring-1 ring-slate-200">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-pink-50 text-pink-500">
                  <SmallIcon name="calendar" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black">Leave Request Details</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    View the details and current status of this leave request.
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
              <DetailSection icon="person" title="Employee Information">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <InitialsAvatar
                    alt={getUserName(user)}
                    className="h-24 w-24"
                    fallback="ME"
                    textClassName="text-2xl"
                    user={user}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black">{getUserName(user)}</p>
                    <p className="text-sm font-bold text-slate-500">{user?.role || "Employee"}</p>
                    <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600">
                      <p className="grid grid-cols-[24px_120px_1fr] items-center gap-2">
                        <SmallIcon name="person" />
                        <span>Department</span>
                        <span className="font-black text-[#111936]">{user?.department || detailRequest.department || "-"}</span>
                      </p>
                      <p className="grid grid-cols-[24px_120px_1fr] items-center gap-2">
                        <SmallIcon name="leave" />
                        <span>Request ID</span>
                        <span className="font-black text-[#111936]">{detailRequest.id}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </DetailSection>

              <DetailSection icon="calendar" title="Request Information">
                <DetailLine icon="leave" label="Leave Type" value={detailRequest.type} />
                <DetailLine icon="calendar" label="Start Date" value={formatDateWithWeekday(detailRequest.startDate)} />
                <DetailLine icon="calendar" label="End Date" value={formatDateWithWeekday(detailRequest.endDate)} />
                <DetailLine icon="time" label="Total Days" value={detailRequest.duration} />
                <DetailLine icon="calendar" label="Submitted Date" value={detailRequest.submitted} />
                <DetailLine icon="message" label="Reason" value={detailRequest.reason} />
              </DetailSection>

              <DetailSection icon="time" title="Leave Timeline">
                <div className="space-y-0">
                  {[
                    {
                      label: "Request Submitted",
                      date: detailRequest.submitted,
                      complete: true,
                    },
                    {
                      label: "Under Review",
                      date: detailRequest.reviewedAt ? formatDateTime(detailRequest.reviewedAt) : "Waiting for review",
                      complete: detailRequest.status !== "Pending",
                    },
                    {
                      label: detailRequest.status === "Rejected" ? "Rejected" : "Approved",
                      date: detailRequest.status === "Pending" ? "Not completed" : formatDateTime(detailRequest.reviewedAt || detailRequest.updatedAt),
                      complete: detailRequest.status !== "Pending",
                      rejected: detailRequest.status === "Rejected",
                    },
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
                        <span className="mt-1 block text-xs font-bold text-slate-500">{item.date || "-"}</span>
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
                      const authorName = getUserName(comment.author);

                      return (
                        <div key={comment._id || `${authorName}-${comment.createdAt}`} className="flex gap-3">
                          <InitialsAvatar
                            alt={authorName}
                            className="h-11 w-11"
                            fallback="U"
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
                        disabled={!commentText.trim()}
                        className="h-9 rounded-xl bg-pink-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              </DetailSection>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setDetailRequestId("")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpLeaverequest;
