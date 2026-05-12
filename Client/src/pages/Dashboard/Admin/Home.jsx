import { useEffect, useMemo, useState } from "react";
import progress from "../../../assets/progress.png";
import pending from "../../../assets/pending.png";
import review from "../../../assets/review.png";
import done from "../../../assets/done.png";
import { dashboardAPI } from "../../../services/api.js";
import { DashboardSkeleton } from "../../../components/Skeleton.jsx";

const statItems = [
  { key: "in_progress", label: "In Progress", icon: "progress" },
  { key: "pending", label: "Pending", icon: "pending" },
  { key: "review", label: "In Review", icon: "review" },
  { key: "done", label: "Done", icon: "done" },
];

const timelineDays = ["M", "T", "W", "T", "F", "S", "S"];
const timelineDayCount = 21;
const timelineTasks = [
  {
    name: "Start",
    effort: 2,
    progress: 100,
    marker: "dot",
    segments: [
      { start: 0.6, width: 1.1, color: "#7da4e6" },
    ],
  },
  {
    name: "Design",
    effort: 3,
    progress: 0,
    marker: "dot",
    segments: [
      { start: 1.5, width: 3.2, color: "#8a97ee", striped: true },
    ],
  },
  {
    name: "Review",
    effort: 0,
    progress: 100,
    marker: "diamond",
    segments: [
      { start: 4.3, width: 0.7, color: "#8d73dc", diamond: true },
    ],
  },
  {
    name: "User tests",
    effort: 2,
    progress: 50,
    marker: "dot",
    segments: [
      { start: 5.0, width: 1.2, color: "#bd75e8", striped: true },
    ],
  },
  {
    name: "Programm...",
    effort: 3,
    progress: 0,
    marker: "dot",
    segments: [
      { start: 6.3, width: 3.0, color: "#d46cdf", striped: true },
    ],
  },
];

const expenseColors = ["#fb4778", "#7c5cff", "#b65cf6", "#ff8a1f"];
const dashboardCardShadow =
  "border-b-2 border-b-[#e347b3] shadow-[0_3px_4px_rgba(190,65,158,0.35)]";
const statStyles = {
  in_progress: { tile: "bg-[#f0e9ff]", text: "text-[#754de8]" },
  pending: { tile: "bg-[#ffeaf5]", text: "text-[#e347a8]" },
  review: { tile: "bg-[#fff0e5]", text: "text-[#ff8317]" },
  done: { tile: "bg-[#eafbed]", text: "text-[#28b84c]" },
};

const parseCalendarDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "string") {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return new Date(
        Number(isoDate[1]),
        Number(isoDate[2]) - 1,
        Number(isoDate[3])
      );
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const startOfWeek = (date) => {
  const startDate = new Date(date);
  const dayOffset = (startDate.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - dayOffset);
  return startDate;
};

const daysBetween = (startDate, endDate) =>
  Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));

const formatWeekLabel = (date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const formatDate = (value) => {
  const date = parseCalendarDate(value);
  if (!date) return "No date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getMonthKey = (value) => {
  const date = parseCalendarDate(value);
  const fallbackDate = date || new Date();
  const year = fallbackDate.getFullYear();
  const month = String(fallbackDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getCurrentMonthKey = () => getMonthKey(new Date());

const getLastMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return getMonthKey(date);
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) return "Unknown Month";

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const getUserId = (value) => value?._id || value?.id || value || "";

const getUserName = (value) => {
  const firstName = value?.firstName || "";
  const lastName = value?.lastName || "";
  const name = `${firstName} ${lastName}`.trim();
  return name || value?.email || "Unassigned";
};

const Icon = ({ name, className = "h-8 w-8" }) => {
  const stroke = "currentColor";

  if (name === "grid") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
          stroke={stroke}
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M8 4h8l1 3H7l1-3zM6 7h12v13H6zM9 12l1.5 1.5L14 10M9 17h6"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "monitor") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M5 5h14v10H5zM9 20h6M12 15v5"
          stroke={stroke}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M5 6h14v10H9l-4 3V6z"
          stroke={stroke}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "budget") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.7" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "client" || name === "employee") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" stroke={stroke} strokeWidth="1.6" />
        <circle cx="16" cy="9" r="2.5" stroke={stroke} strokeWidth="1.6" />
        <path
          d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M12.5 18.5c.6-2.4 2.1-3.7 4.4-3.7 2.4 0 3.9 1.3 4.4 3.7"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "progress") {
    return (
    <img src={progress} alt="In Progress" className={className} aria-hidden="true" />
    );
  }

  if (name === "pending") {
    return (
      <img src={pending} alt="Pending" className={className} aria-hidden="true" />
    );
  }

  if (name === "review") {
    return (
      <img src={review} alt="In Review" className={className} aria-hidden="true" />
    );
  }

  return (
    <img src={done} alt="Done" className={className} aria-hidden="true" />
  );
};

const Avatar = () => (
  <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700">
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <circle cx="16" cy="13" r="6" fill="#8fa2af" />
      <path d="M7 28c1.5-5 4.6-7.5 9-7.5s7.5 2.5 9 7.5" fill="#647887" />
      <path
        d="M10 12h12"
        stroke="#1f2937"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="13" cy="14" r="1.4" fill="#111827" />
      <circle cx="19" cy="14" r="1.4" fill="#111827" />
    </svg>
  </div>
);

const StatCard = ({ item }) => {
  const style = statStyles[item.key] || statStyles.in_progress;

  return (
  <section className={`flex h-32 items-center gap-7 rounded-2xl border border-pink-100 bg-white px-8 ${dashboardCardShadow}`}>
    <span className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${style.tile}`}>
      <Icon name={item.icon} className={`h-14 w-14 ${style.text}`} />
    </span>
    <div className="leading-tight">
      <p className="text-4xl font-extrabold text-[#10172a]">{item.value}</p>
      <p className="mt-3 text-base font-medium text-slate-500">{item.label}</p>
    </div>
  </section>
  );
};

const ProgressRing = ({ value }) => (
  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#a8a2ff] text-[10px] font-semibold text-[#9b91ff]">
    {value}
  </span>
);

const MonthlyChart = ({ tasks }) => {
  const tasksWithDates = tasks
    .map((task) => ({
      ...task,
      calendarStartDate: parseCalendarDate(task.startDate || task.createdAt || task.dueDate),
      calendarDueDate: parseCalendarDate(task.dueDate),
    }))
    .filter((task) => task.calendarStartDate && task.calendarDueDate)
    .sort((firstTask, secondTask) => firstTask.calendarStartDate - secondTask.calendarStartDate);

  const timelineStart = startOfWeek(tasksWithDates[0]?.calendarStartDate || new Date());
  const latestDueDayOffset = tasksWithDates.reduce(
    (latestOffset, task) =>
      Math.max(latestOffset, daysBetween(timelineStart, task.calendarDueDate)),
    timelineDayCount - 1
  );
  const visibleWeekCount = Math.max(3, Math.ceil((latestDueDayOffset + 1) / 7));
  const visibleDayCount = visibleWeekCount * 7;
  const chartMinWidth = Math.max(720, visibleDayCount * 34);
  const chartWeeks = Array.from({ length: visibleWeekCount }, (_, index) => index * 7).map((dayOffset) =>
    formatWeekLabel(addDays(timelineStart, dayOffset))
  );
  const colors = ["#7c5cff", "#ff4ba2", "#ff8a1f", "#25c24d", "#35b5ff"];

  const chartTasks = tasksWithDates.slice(0, 5).map((task, index) => {
    const rawStart = daysBetween(timelineStart, task.calendarStartDate);
    const rawEnd = Math.max(rawStart, daysBetween(timelineStart, task.calendarDueDate));
    const start = Math.min(Math.max(rawStart + 0.1, 0), visibleDayCount - 1);
    const end = Math.min(Math.max(rawEnd + 1, 0.8), visibleDayCount);
    const width = Math.max(end - start, 0.8);
    return {
      name: task.title?.length > 12 ? `${task.title.slice(0, 10)}...` : task.title || "Task",
      effort: task.priority === "high" ? 3 : task.priority === "medium" ? 2 : 1,
      progress: task.status === "done" ? 100 : task.status === "review" ? 75 : task.status === "in_progress" ? 50 : 0,
      segments: [
        {
          start,
          width,
          color: colors[index % colors.length],
          striped: task.status !== "done",
          diamond: task.status === "review",
        },
      ],
    };
  });

  const visibleTasks = chartTasks.length > 0 ? chartTasks : timelineTasks;

  return (
  <section className={`overflow-hidden rounded-2xl border border-pink-100 bg-white px-7 py-7 ${dashboardCardShadow}`}>
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="text-xl font-extrabold text-[#10172a]">Monthly Overview</h2>
    </div>
    <div className="grid grid-cols-[210px_1fr] overflow-x-auto">
      <div className="border-r border-slate-200 pr-5">
        <p className="h-13 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Tasks
        </p>
        {visibleTasks.slice(0, 4).map((task, index) => (
          <div
            key={task.name}
            className="grid h-13 grid-cols-[1fr_26px_34px] items-center gap-3 text-sm text-[#10172a]"
          >
            <span className="flex min-w-0 items-center gap-3 font-semibold">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate">
              {task.name}
              </span>
            </span>
            <span>{task.effort}</span>
            <ProgressRing value={task.progress || 50} />
          </div>
        ))}
      </div>

      <div style={{ minWidth: `${chartMinWidth}px` }}>
        <div
          className="grid h-13 border-b border-neutral-100"
          style={{ gridTemplateColumns: `repeat(${visibleWeekCount}, minmax(0, 1fr))` }}
        >
          {chartWeeks.map((week) => (
            <div key={week} className="border-r border-neutral-100 last:border-r-0">
              <p className="text-center text-sm font-semibold text-[#10172a]">
                {week}
              </p>
              <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-slate-500">
                {timelineDays.map((day, index) => (
                  <span key={`${week}-${day}-${index}`}>{day}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(to right, #e9edf5 0, #e9edf5 1px, transparent 1px, transparent calc(100% / ${visibleDayCount}))`,
            }}
          />
          <div className="relative">
            {visibleTasks.slice(0, 4).map((task) => (
              <div
                key={task.name}
                className="relative h-13 border-b border-neutral-100 last:border-b-0"
              >
                {task.segments.map((segment, index) => (
                  <div
                    key={`${task.name}-${index}`}
                    className={`absolute top-1/2 h-7 -translate-y-1/2 rounded-lg shadow-sm ${
                      segment.diamond ? "aspect-square rotate-45" : ""
                    }`}
                    style={{
                      left: `${(segment.start / visibleDayCount) * 100}%`,
                      width: segment.diamond
                        ? "30px"
                        : `${(segment.width / visibleDayCount) * 100}%`,
                      background: segment.striped
                        ? `repeating-linear-gradient(45deg, ${segment.color} 0, ${segment.color} 2px, rgba(255,255,255,0.65) 2px, rgba(255,255,255,0.65) 5px)`
                        : segment.color,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

const ExpenseChart = ({ budgetEntries }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(budgetEntries.map((entry) => getMonthKey(entry.date || entry.createdAt)))
    );
    const defaultMonths = [getCurrentMonthKey(), getLastMonthKey()];
    return Array.from(new Set([...defaultMonths, ...months])).sort((first, second) =>
      second.localeCompare(first)
    );
  }, [budgetEntries]);

  useEffect(() => {
    if (!monthOptions.includes(selectedMonth)) {
      setSelectedMonth(getCurrentMonthKey());
    }
  }, [monthOptions, selectedMonth]);

  const filteredBudgetEntries = budgetEntries.filter(
    (entry) => getMonthKey(entry.date || entry.createdAt) === selectedMonth
  );
  const expenseCategories = Object.entries(
    filteredBudgetEntries
      .filter((entry) => entry.type === "expense")
      .reduce((result, entry) => {
        const category = entry.category || "General";
        return {
          ...result,
          [category]: (result[category] || 0) + Math.abs(Number(entry.amount) || 0),
        };
      }, {})
  )
    .slice(0, 4)
    .map(([label, value], index) => ({
      label,
      value,
      color: expenseColors[index % expenseColors.length],
    }));
  const total = expenseCategories.reduce((sum, category) => sum + category.value, 0);
  const visibleCategories =
    expenseCategories.length > 0
      ? expenseCategories
      : [{ label: "No expenses", value: 1, color: "#d64ab2" }];
  const gradientStops = visibleCategories.reduce(
    (result, category) => {
      const start = result.currentPercent;
      const end = total > 0 ? start + (category.value / total) * 100 : 100;

      return {
        currentPercent: end,
        stops: [...result.stops, `${category.color} ${start}% ${end}%`],
      };
    },
    { currentPercent: 0, stops: [] }
  ).stops;

  const formatPeso = (amount) =>
    new Intl.NumberFormat("en-PH", {
      currency: "PHP",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(Math.abs(Number(amount) || 0));

  return (
    <section className={`rounded-2xl border border-pink-100 bg-white px-8 py-7 ${dashboardCardShadow}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-[#10172a]">Expense Categories</h2>
        <label className="relative">
          <span className="sr-only">Filter expense categories by month</span>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="h-10 appearance-none rounded-full border border-slate-200 bg-white py-0 pl-4 pr-10 text-sm font-bold text-[#10172a] shadow-sm outline-none transition focus:border-[#df4bb4] focus:ring-2 focus:ring-pink-100"
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month === getCurrentMonthKey()
                  ? "This Month"
                  : month === getLastMonthKey()
                    ? "Last Month"
                    : formatMonthLabel(month)}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10172a]"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </label>
      </div>
      <div
        className="relative mx-auto grid h-60 w-60 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradientStops.join(", ")})` }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-[0_12px_28px_rgba(35,42,72,0.1)]">
          <span>
            <span className="block text-xs font-semibold text-slate-500">Total Expenses</span>
            <span className="mt-1 block text-2xl font-extrabold text-[#10172a]">
              {formatPeso(total)}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm text-[#10172a]">
      {expenseCategories.length === 0 && (
          <span className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#d64ab2]" />
            No expenses
          </span>
        )}
        {expenseCategories.map((category) => (
          <span key={category.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
            <span className="flex min-w-0 items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
              <span className="truncate font-semibold">{category.label}</span>
            </span>
            <span className="font-bold">{formatPeso(category.value)}</span>
            <span className="w-12 text-right font-bold text-slate-500">
              {total > 0 ? `${((category.value / total) * 100).toFixed(1)}%` : "0%"}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
};

const EmployeeTable = ({ title, employees, tone = "violet" }) => (
  <section className={`overflow-hidden rounded-2xl border border-pink-100 bg-white ${dashboardCardShadow}`}>
    <div className="flex items-center justify-between px-7 pt-6">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#10172a]">
        {title}
        <span
          className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm ${
            tone === "pink" ? "bg-pink-100 text-pink-500" : "bg-violet-100 text-violet-600"
          }`}
        >
          {employees.length}
        </span>
      </h2>
    </div>
    <table className="mt-4 w-full text-left text-sm text-[#10172a]">
      <thead className="border-b border-slate-100 text-slate-500">
        <tr>
          <th className="px-7 py-3 font-extrabold">Employee</th>
          <th className="px-3 py-3 font-extrabold">Job</th>
          <th className="px-3 py-3 font-extrabold">Client</th>
          <th className="px-3 py-3 font-extrabold">{tone === "pink" ? "Status" : "Date"}</th>
        </tr>
      </thead>
      <tbody>
        {employees.length === 0 && (
          <tr>
            <td colSpan="4" className="px-5 py-6 text-center text-neutral-500">
              No employees to show.
            </td>
          </tr>
        )}

        {employees.map((employee, index) => (
          <tr key={`${title}-${index}`}>
            <td className="px-7 py-3">
              <div className="flex items-center gap-4">
                <Avatar />
                <span className="font-semibold">{employee.name}</span>
              </div>
            </td>
            <td className="px-3 py-3 font-medium">{employee.job}</td>
            <td className="px-3 py-3 font-medium">{employee.client}</td>
            <td className="px-3 py-3 font-medium">
              {employee.date === "Available" ? (
                <span className="rounded-full bg-green-100 px-4 py-1 font-bold text-green-600">
                  Available
                </span>
              ) : (
                employee.date
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const PlaceholderPanel = ({ title, children }) => (
  <section className={`rounded-lg border border-pink-100 bg-white px-8 py-10 ${dashboardCardShadow}`}>
    <h1
      className="text-2xl uppercase text-neutral-950"
      style={{ fontFamily: "var(--font-bruno)" }}
    >
      {title}
    </h1>
    <p className="mt-3 text-sm font-medium text-neutral-600">{children}</p>
  </section>
);

const AdminDashboard = ({ activePage = "dashboard" }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [taskStatusCounts, setTaskStatusCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const activeTopTab = ["dashboard", "newsfeed", "messages"].includes(activePage)
    ? activePage
    : "dashboard";

  const stats = statItems.map((item) => ({
    ...item,
    value: taskStatusCounts[item.key] ?? tasks.filter((task) => task.status === item.key).length,
  }));

  const activeTaskAssigneeIds = new Set(
    tasks
      .filter((task) => task.status === "in_progress" || task.status === "review")
      .map((task) => getUserId(task.assignedTo))
      .filter(Boolean)
  );

  const workingEmployees = employees
    .filter((employee) => activeTaskAssigneeIds.has(getUserId(employee)))
    .map((employee) => {
      const task = tasks.find((item) => getUserId(item.assignedTo) === getUserId(employee));
      const client = clients.find((item) => getUserId(item.assignedEmployee) === getUserId(employee));

      return {
        name: getUserName(employee),
        job: employee.position || "Employee",
        client: client?.companyName || task?.title || "No client",
        date: formatDate(task?.dueDate),
      };
    });

  const notWorkingEmployees = employees
    .filter((employee) => !activeTaskAssigneeIds.has(getUserId(employee)))
    .map((employee) => ({
      name: getUserName(employee),
      job: employee.position || "Employee",
      client: "No active task",
      date: "Available",
    }));

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const summary = await dashboardAPI.getSummary();

        if (!isMounted) {
          return;
        }

        setTasks(Array.isArray(summary.recentTasks) ? summary.recentTasks : []);
        setEmployees(Array.isArray(summary.recentEmployees) ? summary.recentEmployees : []);
        setClients(Array.isArray(summary.recentClients) ? summary.recentClients : []);
        setBudgetEntries(Array.isArray(summary.recentBudgetEntries) ? summary.recentBudgetEntries : []);
        setTaskStatusCounts(summary.taskStatusCounts || {});
        setLoadError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error.response?.data?.message || "Unable to load dashboard data."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (activeTopTab === "dashboard" && isLoading) {
    return <DashboardSkeleton />;
  }

  return (
        <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-6 bg-[#f8f9fd] px-4 py-5 dark:bg-neutral-950 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loadError}
            </div>
          )}

          {activeTopTab === "dashboard" && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <StatCard key={item.label} item={item} />
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.85fr_0.98fr]">
                <MonthlyChart tasks={tasks} />
                <ExpenseChart budgetEntries={budgetEntries} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <EmployeeTable title="Working" employees={workingEmployees} />
                <EmployeeTable title="Not Working" employees={notWorkingEmployees} tone="pink" />
              </div>
            </>
          )}

          {activeTopTab === "newsfeed" && (
            <PlaceholderPanel title="Newsfeed">
              Latest task, client, and employee updates are connected to the database.
            </PlaceholderPanel>
          )}

          {activeTopTab === "messages" && (
            <PlaceholderPanel title="Messages">
              Message threads will stay on this connected Home tab once the messages API is added.
            </PlaceholderPanel>
          )}
        </div>
  );
};

export default AdminDashboard;
