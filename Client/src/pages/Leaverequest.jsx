import pendingrequest from "../assets/pendingrequest.png";
import done from "../assets/done.png";
import reject from "../assets/reject.png";
import employees from "../assets/employees.png";
import view from "../assets/view.png";
import check from "../assets/check.png";

const summaryCards = [
  { label: "Pending Requests", value: "12", tone: "orange", icon: pendingrequest },
  { label: "Approved This Month", value: "35", tone: "green", icon: done },
  { label: "Rejected", value: "4", tone: "rose", icon: reject },
  { label: "Employees On Leave", value: "8", tone: "pink", icon: employees },
];

const leaveRequests = [
  {
    id: "LR-2026-0052",
    employee: "Janella Ballanay",
    initials: "JB",
    role: "UI/UX Designer",
    type: "Vacation Leave",
    dates: "May 15 - May 18, 2026",
    duration: "4 days",
    department: "Design",
    status: "Pending",
  },
  {
    id: "LR-2026-0051",
    employee: "Juan Dela Cruz",
    initials: "JD",
    role: "Marketing Specialist",
    type: "Sick Leave",
    dates: "May 13 - May 14, 2026",
    duration: "2 days",
    department: "Marketing",
    status: "Pending",
  },
  {
    id: "LR-2026-0049",
    employee: "Christian Reyes",
    initials: "CR",
    role: "Software Developer",
    type: "Vacation Leave",
    dates: "May 20 - May 22, 2026",
    duration: "3 days",
    department: "Development",
    status: "Pending",
  },
  {
    id: "LR-2026-0048",
    employee: "Sophia Ramirez",
    initials: "SR",
    role: "HR Assistant",
    type: "Emergency Leave",
    dates: "May 12, 2026",
    duration: "1 day",
    department: "Human Resources",
    status: "Approved",
  },
  {
    id: "LR-2026-0047",
    employee: "Miguel Torres",
    initials: "MT",
    role: "QA Engineer",
    type: "Sick Leave",
    dates: "May 8 - May 9, 2026",
    duration: "2 days",
    department: "Development",
    status: "Approved",
  },
  {
    id: "LR-2026-0046",
    employee: "Alyssa Gomez",
    initials: "AG",
    role: "Content Writer",
    type: "Vacation Leave",
    dates: "May 5 - May 7, 2026",
    duration: "3 days",
    department: "Marketing",
    status: "Rejected",
  },
];

const historyItems = [
  { employee: "Sophia Ramirez", type: "Emergency Leave", dates: "May 12, 2026", duration: "1 day", status: "Approved" },
  { employee: "Miguel Torres", type: "Sick Leave", dates: "May 8 - May 9, 2026", duration: "2 days", status: "Approved" },
  { employee: "Alyssa Gomez", type: "Vacation Leave", dates: "May 5 - May 7, 2026", duration: "3 days", status: "Rejected" },
  { employee: "Kevin Villanueva", type: "Vacation Leave", dates: "Apr 30 - May 1, 2026", duration: "2 days", status: "Approved" },
];

const calendarEvents = [
  { day: 5, span: "col-span-3", label: "Alyssa Gomez (VL)", color: "bg-emerald-100 text-emerald-700" },
  { day: 8, span: "col-span-2", label: "Miguel Torres (SL)", color: "bg-rose-100 text-rose-700" },
  { day: 12, span: "col-span-1", label: "Sophia R. (EL)", color: "bg-orange-100 text-orange-700" },
  { day: 14, span: "col-span-3", label: "Juan Dela Cruz (SL)", color: "bg-pink-100 text-pink-700" },
  { day: 17, span: "col-span-2", label: "Janella Ballanay (VL)", color: "bg-pink-100 text-pink-700" },
  { day: 20, span: "col-span-3", label: "Christian Reyes (VL)", color: "bg-sky-100 text-sky-700" },
];

const toneStyles = {
  orange: "bg-orange-50 text-orange-500 ring-orange-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  rose: "bg-rose-50 text-rose-500 ring-rose-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
};

const statusStyles = {
  Pending: "bg-orange-50 text-orange-600 ring-orange-100",
  Approved: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Rejected: "bg-rose-50 text-rose-600 ring-rose-100",
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
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statusStyles[status]}`}>
    {status}
  </span>
);

const Avatar = ({ initials, name, size = "h-10 w-10" }) => (
  <span className={`${size} grid shrink-0 place-items-center rounded-full bg-linear-to-br from-pink-100 via-white to-rose-100 text-sm font-extrabold text-[#d9469d] ring-1 ring-pink-100`} title={name}>
    {initials}
  </span>
);

const LeaveRequest = () => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = Array.from({ length: 35 }, (_, index) => index - 4);
  const selectedRequest = leaveRequests[0];

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${toneStyles[card.tone]}`}>
                <ImageIcon src={card.icon} className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-slate-600">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-[#10142d]">{card.value}</p>
                <p className={`mt-1 text-xs font-extrabold ${card.tone === "green" ? "text-emerald-600" : card.tone === "rose" ? "text-rose-500" : "text-orange-500"}`}>
                  {card.note}
                </p>
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
              <select className="h-10 rounded-xl border border-pink-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none">
                <option>All Departments</option>
                <option>Design</option>
                <option>Development</option>
                <option>Marketing</option>
              </select>
              <select className="h-10 rounded-xl border border-pink-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none">
                <option>This Month</option>
                <option>Last Month</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {["All", "Pending", "Approved", "Rejected"].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${index === 0 ? "bg-pink-100 text-pink-700 shadow-sm" : "border border-pink-100 bg-white text-slate-600 hover:bg-pink-50"}`}
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
                {leaveRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-pink-50/40">
                    <td className="px-3 py-3 font-black text-pink-700">{request.id}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={request.initials} name={request.employee} />
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
                        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-100 bg-emerald-50" aria-label="Approve">
                          <ImageIcon src={check} className="h-5 w-5" />
                        </button>
                        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 bg-rose-50" aria-label="Reject">
                          <ImageIcon src={reject} className="h-5 w-5" />
                        </button>
                        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-pink-50" aria-label="View details">
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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Team Leave Calendar</h2>
              <span className="text-sm font-black text-pink-600">May 2026</span>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">
              {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {days.map((day, index) => (
                <div key={`${day}-${index}`} className={`relative h-16 rounded-xl border border-pink-50 bg-white text-sm font-black ${day < 1 || day > 30 ? "text-slate-300" : "text-[#111936]"}`}>
                  <span className="absolute left-2 top-2">{day < 1 ? 30 + day : day > 30 ? day - 30 : day}</span>
                  {calendarEvents.filter((event) => event.day === day).map((event) => (
                    <div key={event.label} className={`absolute bottom-2 left-1 right-1 truncate rounded-full px-2 py-1 text-[10px] font-black ${event.color}`}>
                      {event.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
              {["Vacation Leave", "Sick Leave", "Emergency Leave", "Holiday"].map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${["bg-emerald-500", "bg-rose-500", "bg-sky-500", "bg-pink-500"][index]}`} />
                  {item}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black">Request Details</h2>
              <StatusPill status="Pending" />
            </div>
            <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="text-center">
                <Avatar initials={selectedRequest.initials} name={selectedRequest.employee} size="mx-auto h-14 w-14" />
                <p className="mt-3 text-base font-black">{selectedRequest.employee}</p>
                <p className="text-sm font-bold text-slate-500">{selectedRequest.role}</p>
                <p className="text-sm font-bold text-slate-500">{selectedRequest.department}</p>
              </div>
              <div className="grid gap-3 text-sm font-bold text-slate-600">
                <p><span className="text-slate-400">Leave dates:</span> {selectedRequest.dates}</p>
                <p><span className="text-slate-400">Duration:</span> {selectedRequest.duration}</p>
                <p><span className="text-slate-400">Leave type:</span> {selectedRequest.type}</p>
                <p><span className="text-slate-400">Reason:</span> Family vacation trip.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" className="h-10 rounded-xl bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-100">Approve</button>
              <button type="button" className="h-10 rounded-xl bg-rose-500 text-xs font-black text-white shadow-lg shadow-rose-100">Reject</button>
              <button type="button" className="h-10 rounded-xl border border-pink-300 bg-white text-xs font-black text-pink-700">View Details</button>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4">
            <h2 className="text-lg font-black">Leave Analytics</h2>
            <select className="h-9 rounded-xl border border-pink-100 bg-white px-4 text-xs font-bold text-slate-700 outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr_0.62fr]">
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[140px_1fr]">
              <div>
                <p className="mb-3 text-sm font-black">Leave by Type</p>
                <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: "conic-gradient(#10b867 0 51%, #f53b98 51% 75%, #1e9de8 75% 90%, #ec4899 90% 100%)" }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-sm">
                    <span className="text-2xl font-black leading-none">41<span className="mt-1 block text-xs text-slate-500">Total</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full space-y-3 text-xs font-bold">
                  {[
                    ["Vacation", "21 (51%)", "bg-emerald-500"],
                    ["Sick", "10 (24%)", "bg-pink-500"],
                    ["Emergency", "6 (15%)", "bg-sky-500"],
                    ["Others", "4 (10%)", "bg-pink-500"],
                  ].map(([label, value, color]) => (
                    <p key={label} className="grid grid-cols-[1fr_auto] items-center gap-5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        {label}
                      </span>
                      <span className="text-[#111936]">{value}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-y border-pink-50 px-5 py-5 lg:border-x lg:border-y-0">
              <p className="mb-4 text-sm font-black">Most Used Leave Type</p>
              {[
                ["Vacation Leave", 88, "21", "bg-emerald-500"],
                ["Sick Leave", 58, "10", "bg-pink-500"],
                ["Emergency Leave", 38, "6", "bg-sky-500"],
                ["Others", 28, "4", "bg-pink-500"],
              ].map(([label, width, value, color]) => (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs font-black text-slate-500">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-pink-50">
                    <div className={`h-3 rounded-full ${color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center px-5 py-5 text-center">
              <p className="mb-4 text-sm font-black">Employees on Leave Today</p>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-pink-100">
                <ImageIcon src={employees} className="h-9 w-9" />
              </div>
              <p className="mt-3 text-3xl font-black">8</p>
              <p className="text-xs font-bold text-slate-500">employees</p>
              <div className="mt-4 flex items-center gap-3 text-xs font-black">
                <span className="text-slate-500">vs yesterday</span>
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-600">+2</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-base font-black">Recent Leave History</h2>
            <span className="text-sm font-black text-pink-600">View all</span>
          </div>
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs font-black uppercase text-slate-400">
                <tr>
                  {["Employee", "Leave Type", "Dates", "Duration", "Status"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {historyItems.map((item) => (
                  <tr key={`${item.employee}-${item.dates}`}>
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
    </div>
  );
};

export default LeaveRequest;
