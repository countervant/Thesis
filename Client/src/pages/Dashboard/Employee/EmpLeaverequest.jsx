import check from "../../../assets/check.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import reject from "../../../assets/reject.png";

const stats = [
  { label: "Pending Requests", value: "2", icon: pendingrequest, tone: "orange" },
  { label: "Approved", value: "5", icon: check, tone: "green" },
  { label: "Rejected", value: "1", icon: reject, tone: "rose" },
];

const history = [
  { id: "LR-2026-0052", type: "Vacation Leave", dates: "May 15, 2026 - May 18, 2026", duration: "4 days", status: "Pending", submitted: "May 09, 2026 09:30 AM", approvedBy: "-" },
  { id: "LR-2026-0048", type: "Sick Leave", dates: "Apr 28, 2026 - Apr 29, 2026", duration: "2 days", status: "Approved", submitted: "Apr 26, 2026 02:15 PM", approvedBy: "Jane Smith (HR)" },
  { id: "LR-2026-0042", type: "Vacation Leave", dates: "Apr 10, 2026 - Apr 12, 2026", duration: "3 days", status: "Approved", submitted: "Apr 02, 2026 11:10 AM", approvedBy: "Jane Smith (HR)" },
  { id: "LR-2026-0035", type: "Emergency Leave", dates: "Mar 18, 2026 - Mar 18, 2026", duration: "1 day", status: "Rejected", submitted: "Mar 17, 2026 05:20 PM", approvedBy: "John Miller (Manager)" },
  { id: "LR-2026-0029", type: "Vacation Leave", dates: "Feb 20, 2026 - Feb 24, 2026", duration: "5 days", status: "Approved", submitted: "Feb 10, 2026 09:45 AM", approvedBy: "Jane Smith (HR)" },
];

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
  if (name === "chevron") return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyles[status]}`}>
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

const Calendar = () => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = Array.from({ length: 35 }, (_, index) => index - 4);
  const markedDays = {
    15: "bg-emerald-500 text-white",
    16: "bg-emerald-50 text-emerald-700",
    17: "bg-emerald-50 text-emerald-700",
    18: "bg-emerald-50 text-emerald-700",
    19: "bg-orange-50 text-orange-600",
    25: "bg-[#7427ff] text-white",
  };

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black">Leave Calendar</h2>
        <div className="flex items-center gap-4 text-sm font-black text-[#10142d]">
          <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" aria-label="Previous month">
            <SmallIcon name="chevron" className="h-4 w-4 rotate-180" />
          </button>
          May 2026
          <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" aria-label="Next month">
            <SmallIcon name="chevron" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">
        {weekDays.map((day) => <span key={day} className="py-2">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const label = day < 1 ? 30 + day : day > 31 ? day - 31 : day;
          const isMuted = day < 1 || day > 31;
          return (
            <div key={`${day}-${index}`} className="grid h-12 place-items-center text-sm font-black">
              <span className={`grid h-9 min-w-9 place-items-center rounded-full px-2 ${markedDays[day] || ""} ${isMuted ? "text-slate-300" : "text-[#10142d]"}`}>
                {label}
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
          ["Holiday", "bg-[#7427ff]"],
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
  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[#10142d]">Leave Requests</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Request time off and track your leave status.
        </p>
      </header>

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
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-600">Leave Type <span className="text-pink-500">*</span></span>
              <select className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100">
                <option>Vacation Leave</option>
                <option>Sick Leave</option>
                <option>Emergency Leave</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-600">Start Date <span className="text-pink-500">*</span></span>
              <span className="relative block">
                <input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100" value="May 15, 2026" readOnly />
                <SmallIcon name="calendar" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-600">End Date <span className="text-pink-500">*</span></span>
              <span className="relative block">
                <input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100" value="May 18, 2026" readOnly />
                <SmallIcon name="calendar" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-600">Total Duration</span>
              <input className="h-12 w-full rounded-xl border border-pink-100 bg-pink-50 px-4 text-sm font-black text-pink-700 outline-none" value="4 days" readOnly />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black text-slate-600">Reason <span className="text-pink-500">*</span></span>
              <textarea className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100" defaultValue="Family vacation trip." />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black text-slate-600">Emergency Contact <span className="text-pink-500">*</span></span>
              <span className="relative block">
                <input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm font-bold text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100" value="Juan Dela Cruz (0917 123 4567)" readOnly />
                <SmallIcon name="person" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="h-12 rounded-xl border border-slate-200 bg-white px-9 text-sm font-black text-slate-600">Cancel</button>
            <button type="button" className="h-12 rounded-xl bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-9 text-sm font-black text-white shadow-[0_4px_8px_rgba(219,74,181,0.35)]">
              Submit Request
            </button>
          </div>
        </Card>

        <Calendar />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-5">
          <h2 className="text-xl font-black">Leave History</h2>
          <select className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#10142d] outline-none">
            <option>All Status</option>
            <option>Approved</option>
            <option>Pending</option>
            <option>Rejected</option>
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
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-pink-50/40">
                  <td className="px-3 py-4 font-black text-pink-700">{item.id}</td>
                  <td className="px-3 py-4"><LeaveType type={item.type} /></td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.dates}</td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.duration}</td>
                  <td className="px-3 py-4"><StatusPill status={item.status} /></td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.submitted}</td>
                  <td className="px-3 py-4 font-bold text-slate-600">{item.approvedBy}</td>
                  <td className="px-3 py-4">
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-pink-50" aria-label={`More actions for ${item.id}`}>
                      <SmallIcon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-pink-50 px-5 py-4 text-sm font-black text-slate-500">
          <span>1-5 of 8 requests</span>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-white text-slate-500">‹</button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-b from-[#df4bb4] to-[#c72fb2] text-white">1</button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-white text-slate-600">2</button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-white text-slate-500">›</button>
        </div>
      </Card>
    </div>
  );
};

export default EmpLeaverequest;
