import { useEffect, useMemo, useState } from "react";
import progress from "../../../assets/progress.png";
import pending from "../../../assets/pending.png";
import review from "../../../assets/Review.png";
import done from "../../../assets/done.png";
import {
  authAPI,
  budgetAPI,
  calendarAPI,
  clientAPI,
  employeeAPI,
  getApiErrorMessage,
  newsfeedAPI,
  taskAPI,
} from "../../../services/api.js";
import InitialsAvatar from "../../../components/InitialsAvatar.jsx";
import { DashboardSkeleton } from "../../../components/Skeleton.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";

const statItems = [
  { key: "in_progress", label: "In Progress", icon: "progress" },
  { key: "pending", label: "Pending", icon: "pending" },
  { key: "review", label: "In Review", icon: "review" },
  { key: "done", label: "Done", icon: "done" },
];

const timelineDays = ["M", "T", "W", "T", "F", "S", "S"];
const timelineDayCount = 21;
const monthlyOverviewVisibleRows = 10;
const compactListVisibleRows = 5;
const modalListVisibleRows = 10;
const timelineTasks = [
  {
    name: "Start",
    priority: "medium",
    progress: 100,
    marker: "dot",
    segments: [
      { start: 0.6, width: 1.1, color: "#7da4e6" },
    ],
  },
  {
    name: "Design",
    priority: "high",
    progress: 0,
    marker: "dot",
    segments: [
      { start: 1.5, width: 3.2, color: "#8a97ee", striped: true },
    ],
  },
  {
    name: "Review",
    priority: "low",
    progress: 100,
    marker: "diamond",
    segments: [
      { start: 4.3, width: 0.7, color: "#8d73dc", diamond: true },
    ],
  },
  {
    name: "User tests",
    priority: "medium",
    progress: 50,
    marker: "dot",
    segments: [
      { start: 5.0, width: 1.2, color: "#bd75e8", striped: true },
    ],
  },
  {
    name: "Programm...",
    priority: "high",
    progress: 0,
    marker: "dot",
    segments: [
      { start: 6.3, width: 3.0, color: "#d46cdf", striped: true },
    ],
  },
];

const expenseColors = ["#fb4778", "#7c5cff", "#b65cf6", "#ff8a1f"];
const dashboardCardShadow =
  "border-b-2 border-b-[#86003C]/55 shadow-sm ring-1 ring-[#86003C]/20 dark:!border-b-[#86003C] dark:!ring-[#86003C]/45";
const statStyles = {
  in_progress: {
    tile: "bg-[#f0e9ff]",
    text: "text-[#754de8]",
    card: "!border-[#754de8]/45 !border-b-[#754de8] !ring-[#754de8]/20 dark:!border-[#754de8] dark:!border-b-[#754de8] dark:!ring-[#754de8]/45",
  },
  pending: {
    tile: "bg-[#ffeaf5]",
    text: "text-[#e347a8]",
    card: "!border-[#e347a8]/45 !border-b-[#e347a8] !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
  },
  review: {
    tile: "bg-[#fff0e5]",
    text: "text-[#ff8317]",
    card: "!border-[#ff8317]/45 !border-b-[#ff8317] !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  },
  done: {
    tile: "bg-[#eafbed]",
    text: "text-[#28b84c]",
    card: "!border-[#28b84c]/45 !border-b-[#28b84c] !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  },
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

const formatActivityTime = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

const getNextMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return getMonthKey(date);
};

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

const getClientName = (value) =>
  value?.companyName || value?.contactPerson || value?.email || "Client";

const toDateKey = (value) => {
  const date = parseCalendarDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const Avatar = ({ name }) => (
  <InitialsAvatar className="h-8 w-8" name={name} textClassName="text-xs" />
);

const StatCard = ({ item }) => {
  const style = statStyles[item.key] || statStyles.in_progress;

  return (
  <section className={`relative flex min-h-[86px] flex-col items-start justify-between rounded-xl border border-b-2 bg-white px-3 py-3 shadow-[0_3px_4px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.04)] ring-1 md:min-h-0 md:h-24 md:flex-row md:items-center md:justify-start md:gap-4 md:rounded-2xl md:px-5 md:py-0 dark:bg-[#141414] ${style.card}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-14 md:w-14 md:rounded-2xl ${style.tile}`}>
      <Icon name={item.icon} className={`h-6 w-6 md:h-9 md:w-9 ${style.text}`} />
    </span>
    <div className="leading-tight">
      <p className="text-sm font-extrabold text-[#10172a] md:text-2xl dark:text-white">{item.value}</p>
      <p className="mt-1 text-[9px] font-semibold leading-tight text-slate-500 md:mt-1.5 md:text-xs dark:text-neutral-100">{item.label}</p>
    </div>
  </section>
  );
};

const ProgressRing = ({ value }) => (
  <span className="grid h-5 min-w-7 place-items-center rounded-full border border-[#a8a2ff] px-1 text-[8px] font-semibold text-[#9b91ff] md:h-6 md:min-w-9 md:border-2 md:px-1.5 md:text-[9px]">
    {value}
  </span>
);

const getTaskProgress = (subtasks = []) => {
  if (!Array.isArray(subtasks) || subtasks.length === 0) return 0;
  const completedCount = subtasks.filter((subtask) => subtask?.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
};

const priorityBadgeStyles = {
  high: "border border-pink-600 bg-transparent text-pink-600",
  medium: "border border-orange-600 bg-transparent text-orange-600",
  low: "border border-emerald-600 bg-transparent text-emerald-600",
};

const normalizePriority = (priority) => {
  const normalizedPriority = String(priority || "medium").toLowerCase();
  return priorityBadgeStyles[normalizedPriority] ? normalizedPriority : "medium";
};

const getPriorityInitial = (priority) => normalizePriority(priority)[0].toUpperCase();

const getPriorityBadgeClass = (priority) => {
  const normalizedPriority = normalizePriority(priority);
  return priorityBadgeStyles[normalizedPriority];
};

const MonthlyChart = ({ tasks }) => {
  const tasksWithDates = tasks
    .filter((task) => task?.status !== "done")
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
  const chartMinWidth = Math.max(440, visibleDayCount * 22);
  const chartWeeks = Array.from({ length: visibleWeekCount }, (_, index) => index * 7).map((dayOffset) =>
    formatWeekLabel(addDays(timelineStart, dayOffset))
  );
  const colors = ["#7c5cff", "#ff4ba2", "#ff8a1f", "#25c24d", "#35b5ff"];
  const shouldScrollRows = tasksWithDates.length > monthlyOverviewVisibleRows;
  const chartRowsMaxHeight = monthlyOverviewVisibleRows * 40;

  const chartTasks = tasksWithDates.map((task, index) => {
    const rawStart = daysBetween(timelineStart, task.calendarStartDate);
    const rawEnd = Math.max(rawStart, daysBetween(timelineStart, task.calendarDueDate));
    const start = Math.min(Math.max(rawStart + 0.1, 0), visibleDayCount - 1);
    const end = Math.min(Math.max(rawEnd + 1, 0.8), visibleDayCount);
    const width = Math.max(end - start, 0.8);
    return {
      id: task._id || task.id || `${task.title || "task"}-${index}`,
      name: task.title?.length > 12 ? `${task.title.slice(0, 10)}...` : task.title || "Task",
      priority: normalizePriority(task.priority),
      progress: getTaskProgress(task.subtasks),
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
  <section className={`overflow-hidden rounded-xl border border-pink-100 bg-white px-4 py-4 md:rounded-2xl md:px-5 md:py-5 ${dashboardCardShadow}`}>
    <div className="mb-3 flex items-center justify-between gap-4 md:mb-4">
      <h2 className="text-sm font-extrabold text-[#10172a] md:text-base dark:text-white">Monthly Overview</h2>
      <button type="button" className="box-border h-8 shrink-0 rounded-full border-2 border-slate-200 bg-transparent px-3 text-[10px] font-black leading-none text-[#10172a] md:h-10 md:rounded-2xl md:px-4 md:text-sm dark:border-[#e347a8] dark:text-white">
        This Month
      </button>
    </div>
    <div
      className={`grid grid-cols-[86px_1fr] overflow-x-auto md:grid-cols-[178px_1fr] ${shouldScrollRows ? "overflow-y-auto pr-2" : ""}`}
      style={shouldScrollRows ? { maxHeight: `${32 + chartRowsMaxHeight}px` } : undefined}
    >
      <div className="border-r border-slate-200 pr-2 md:pr-4">
        <p className="h-8 text-[8px] font-extrabold uppercase text-slate-500 md:h-10 md:text-[11px] dark:text-white">
          Tasks
        </p>
        {visibleTasks.map((task, index) => {
          const priorityClass = getPriorityBadgeClass(task.priority);

          return (
            <div
              key={task.id || task.name}
              className="grid h-7 grid-cols-[1fr_18px] items-center gap-1 text-[9px] text-[#10172a] md:h-10 md:grid-cols-[1fr_28px_42px] md:gap-2 md:text-xs dark:text-white"
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="truncate">
                {task.name}
                </span>
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black ${priorityClass}`}>
                {getPriorityInitial(task.priority)}
              </span>
              <span className="hidden md:inline-grid">
              <ProgressRing value={`${task.progress ?? 0}%`} />
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ minWidth: `${chartMinWidth}px` }}>
        <div
          className="grid h-8 border-b border-neutral-100 md:h-10"
          style={{ gridTemplateColumns: `repeat(${visibleWeekCount}, minmax(0, 1fr))` }}
        >
          {chartWeeks.map((week) => (
            <div key={week} className="border-r border-neutral-100 last:border-r-0">
              <p className="text-center text-[8px] font-semibold text-[#10172a] md:text-xs dark:text-white">
                {week}
              </p>
              <div className="mt-1 grid grid-cols-7 text-center text-[8px] font-bold text-slate-500 md:mt-2 md:text-[10px] dark:text-white">
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
            {visibleTasks.map((task) => (
              <div
                key={task.id || task.name}
                className="relative h-7 border-b border-neutral-100 last:border-b-0 md:h-10"
              >
                {task.segments.map((segment, index) => (
                  <div
                    key={`${task.name}-${index}`}
                    className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-sm shadow-sm md:h-5 md:rounded-md ${
                      segment.diamond ? "aspect-square rotate-45" : ""
                    }`}
                    style={{
                      left: `${(segment.start / visibleDayCount) * 100}%`,
                      width: segment.diamond
                        ? "22px"
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

  const activeMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : getCurrentMonthKey();

  const filteredBudgetEntries = budgetEntries.filter(
    (entry) => getMonthKey(entry.date || entry.createdAt) === activeMonth
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
    <section className={`rounded-xl border border-pink-100 bg-white px-4 py-4 md:rounded-2xl md:px-5 md:py-5 ${dashboardCardShadow}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[#10172a] md:text-base dark:text-white">Expense Summary</h2>
        <label className="relative">
          <span className="sr-only">Filter expense categories by month</span>
          <select
            value={activeMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="box-border h-8 appearance-none rounded-full border-2 border-slate-200 bg-white py-0 pl-3 pr-8 text-[10px] font-bold text-[#10172a] outline-none transition focus:border-[#e347a8] md:h-9 md:pr-9 md:text-xs dark:border-[#e347a8] dark:text-white"
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
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10172a] dark:text-white"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </label>
      </div>
      <div className="grid grid-cols-[112px_1fr] items-center gap-4 md:block">
        <div
          className="relative mx-auto grid h-28 w-28 place-items-center rounded-full md:h-44 md:w-44"
          style={{ background: `conic-gradient(${gradientStops.join(", ")})` }}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center shadow-[0_12px_28px_rgba(35,42,72,0.1)] md:h-24 md:w-24 dark:bg-neutral-950">
            <span>
              <span className="block text-[7px] font-semibold text-slate-500 md:text-[10px] dark:text-white">Total Expenses</span>
              <span className="mt-0.5 block text-xs font-extrabold text-[#10172a] md:mt-1 md:text-lg dark:text-white">
                {formatPeso(total)}
              </span>
            </span>
          </div>
        </div>
        <div className="space-y-2 text-[9px] text-[#10172a] md:mt-4 md:text-xs dark:text-white">
        {expenseCategories.length === 0 && (
            <span className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#d64ab2]" />
              No expenses
            </span>
          )}
          {expenseCategories.map((category) => (
            <span key={category.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 md:gap-3">
              <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
                <span className="truncate font-semibold">{category.label}</span>
              </span>
              <span className="font-bold">{formatPeso(category.value)}</span>
              <span className="w-9 text-right font-bold text-slate-500 md:w-12 dark:text-white">
                {total > 0 ? `${((category.value / total) * 100).toFixed(1)}%` : "0%"}
              </span>
            </span>
          ))}
        </div>
      </div>

    </section>
  );
};

const EmployeeTable = ({ title, employees, tone = "violet" }) => {
  const [isViewingAll, setIsViewingAll] = useState(false);
  const canViewAll = employees.length > compactListVisibleRows;
  const tableMaxHeight = compactListVisibleRows * 52 + 38;
  const modalTableMaxHeight = modalListVisibleRows * 52 + 38;

  const renderTable = () => (
    <table className="w-full min-w-[520px] text-left text-xs text-[#10172a] dark:text-white">
      <thead className="border-b border-slate-100 text-slate-500 dark:text-white">
        <tr>
          <th className="px-5 py-2.5 font-extrabold">Employee</th>
          <th className="px-3 py-2.5 font-extrabold">Job</th>
          <th className="px-3 py-2.5 font-extrabold">Client</th>
          <th className="px-3 py-2.5 font-extrabold">{tone === "pink" ? "Status" : "Date"}</th>
        </tr>
      </thead>
      <tbody>
        {employees.length === 0 && (
          <tr>
            <td colSpan="4" className="px-5 py-5 text-center text-neutral-500 dark:text-white">
              No employees to show.
            </td>
          </tr>
        )}

        {employees.map((employee, index) => (
          <tr key={`${title}-${index}`} className="border-b border-slate-50 last:border-b-0">
            <td className="px-5 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar name={employee.name} />
                <span className="font-semibold">{employee.name}</span>
              </div>
            </td>
            <td className="px-3 py-2.5 font-medium">{employee.job}</td>
            <td className="px-3 py-2.5 font-medium">{employee.client}</td>
            <td className="px-3 py-2.5 font-medium">
              {employee.date === "Available" ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-600">
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
  );

  const renderMobileList = () => (
    <div className="space-y-2 px-3 pb-3 md:hidden">
      {employees.length === 0 && (
        <p className="py-5 text-center text-xs font-semibold text-neutral-500 dark:text-white">
          No employees to show.
        </p>
      )}
      {employees.slice(0, compactListVisibleRows).map((employee, index) => (
        <div key={`${title}-mobile-${index}`} className="flex items-center gap-2">
          <Avatar name={employee.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-black text-[#10172a] dark:text-white">
              {employee.name}
            </span>
            <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-500 dark:text-white">
              {employee.job}
            </span>
          </span>
          {employee.date === "Available" ? (
            <span className="rounded-full bg-green-100 px-2 py-1 text-[8px] font-bold text-green-600">
              Available
            </span>
          ) : (
            <span className="max-w-12 truncate text-[8px] font-bold text-slate-500 dark:text-white">
              {employee.date}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <section className={`overflow-hidden rounded-xl border border-pink-100 bg-white md:rounded-2xl ${dashboardCardShadow}`}>
        <div className="flex items-center justify-between gap-2 px-3 py-3 md:gap-4 md:px-5 md:pt-4 md:pb-0">
          <h2 className="flex min-w-0 items-center gap-1.5 text-[11px] font-extrabold text-[#10172a] md:gap-2 md:text-base dark:text-white">
            {title}
            <span
              className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[9px] md:h-6 md:min-w-6 md:px-2 md:text-xs ${
                tone === "pink" ? "bg-pink-100 text-pink-500" : "bg-violet-100 text-violet-600"
              }`}
            >
              {employees.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => canViewAll && setIsViewingAll(true)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[15px] font-black text-[#10172a] transition hover:bg-pink-50 md:hidden"
            aria-label={`View ${title}`}
          >
            &rsaquo;
          </button>
          {canViewAll && (
            <button
              type="button"
              onClick={() => setIsViewingAll(true)}
              className="hidden shrink-0 text-xs font-black text-pink-600 transition hover:text-pink-700 md:block"
            >
              View all
            </button>
          )}
        </div>
        {renderMobileList()}
        <div
          className={`mt-3 hidden overflow-x-auto md:block ${canViewAll ? "overflow-y-auto" : ""}`}
          style={canViewAll ? { maxHeight: `${tableMaxHeight}px` } : undefined}
        >
          {renderTable()}
        </div>
      </section>

      {isViewingAll && (
        <FloatingListPanel title={title} onClose={() => setIsViewingAll(false)}>
          <div className="overflow-x-auto overflow-y-auto pr-2" style={{ maxHeight: `${modalTableMaxHeight}px` }}>
            {renderTable()}
          </div>
        </FloatingListPanel>
      )}
    </>
  );
};

const PlaceholderPanel = ({ title, children }) => (
  <section className={`rounded-lg border border-pink-100 bg-white px-8 py-10 ${dashboardCardShadow}`}>
    <h1
      className="text-2xl uppercase text-neutral-950 dark:text-white"
      style={{ fontFamily: "var(--font-bruno)" }}
    >
      {title}
    </h1>
    <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-white">{children}</p>
  </section>
);

const FloatingListPanel = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
    <section className={`w-full max-w-3xl rounded-2xl border border-pink-100 bg-white px-5 py-4 ${dashboardCardShadow}`}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-extrabold text-[#10172a] dark:text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full border border-pink-100 text-sm font-black text-pink-600 transition hover:bg-pink-50"
          aria-label={`Close ${title}`}
        >
          x
        </button>
      </div>
      {children}
    </section>
  </div>
);

const activityTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const RecentActivities = ({
  budgetEntries,
  calendarEvents,
  clients,
  employees,
  newsfeedActivities,
  tasks,
}) => {
  const [isViewingAll, setIsViewingAll] = useState(false);
  const activities = [
    ...tasks.map((task) => {
      const actor = task.status === "done" ? task.assignedTo : task.createdBy || task.assignedTo;
      return {
        id: `task-${task._id || task.id}`,
        name: getUserName(actor),
        text: `${task.status === "done" ? "completed" : "updated"} task "${task.title || "Untitled Task"}"`,
        time: task.updatedAt || task.completedAt || task.createdAt || task.dueDate,
      };
    }),
    ...employees.map((employee) => ({
      id: `employee-${employee._id || employee.id}`,
      name: getUserName(employee),
      text: "updated their profile",
      time: employee.updatedAt || employee.createdAt,
    })),
    ...clients.map((client) => ({
      id: `client-${client._id || client.id}`,
      name: getClientName(client),
      text: "was added as a client",
      time: client.updatedAt || client.createdAt,
    })),
    ...budgetEntries.map((entry) => ({
      id: `budget-${entry._id || entry.id}`,
      name: entry.category || entry.type || "Budget",
      text: `recorded ${entry.type || "budget"} entry "${entry.description || "Untitled"}"`,
      time: entry.updatedAt || entry.createdAt || entry.date,
    })),
    ...calendarEvents.map((event) => ({
      id: `event-${event._id || event.id}`,
      name: event.title || "Calendar event",
      text: `scheduled ${event.type || "event"}`,
      time: event.updatedAt || event.createdAt || event.date,
    })),
    ...newsfeedActivities.map((post) => ({
      id: `post-${post._id || post.id}`,
      name: getUserName(post.author),
      text: `posted "${String(post.content || "an update").slice(0, 42)}${String(post.content || "").length > 42 ? "..." : ""}"`,
      time: post.updatedAt || post.createdAt,
    })),
  ]
    .filter((activity) => activity.time)
    .sort((first, second) => activityTimestamp(second.time) - activityTimestamp(first.time));
  const canViewAll = activities.length > compactListVisibleRows;
  const listMaxHeight = compactListVisibleRows * 58;
  const modalListMaxHeight = modalListVisibleRows * 58;

  const ActivityRow = ({ activity, index }) => (
    <div key={activity.id || `${activity.name}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Avatar name={activity.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black text-[#10172a] dark:text-white">
          {activity.name} <span className="font-semibold">{activity.text}</span>
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-slate-500 dark:text-white">
          {formatActivityTime(activity.time)}
        </span>
      </span>
    </div>
  );

  return (
    <>
      <section className={`rounded-3xl border border-pink-100 bg-white px-5 py-4 md:rounded-2xl ${dashboardCardShadow}`}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#10172a] dark:text-white">
            <span className="text-[#c72fb2]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M4 13h4l2-7 4 14 2-7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Recent Activities
          </h2>
          {canViewAll && (
            <button
              type="button"
              onClick={() => setIsViewingAll(true)}
              className="shrink-0 text-xs font-black text-pink-600 transition hover:text-pink-700"
            >
              View all
            </button>
          )}
        </div>
        <div
          className={`divide-y divide-slate-100 ${canViewAll ? "overflow-y-auto pr-2" : ""}`}
          style={canViewAll ? { maxHeight: `${listMaxHeight}px` } : undefined}
        >
          {activities.length === 0 && (
            <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-white">
              No recent activities yet.
            </p>
          )}
          {activities.map((activity, index) => (
            <ActivityRow key={activity.id || `${activity.name}-${index}`} activity={activity} index={index} />
          ))}
        </div>
      </section>

      {isViewingAll && (
        <FloatingListPanel title="Recent Activities" onClose={() => setIsViewingAll(false)}>
          <div
            className="divide-y divide-slate-100 overflow-y-auto pr-2"
            style={{ maxHeight: `${modalListMaxHeight}px` }}
          >
            {activities.map((activity, index) => (
              <ActivityRow key={activity.id || `${activity.name}-${index}`} activity={activity} index={index} />
            ))}
          </div>
        </FloatingListPanel>
      )}
    </>
  );
};

const calendarDotStyles = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  violet: "bg-violet-600",
};

const calendarTypeStyles = {
  "Company Event": "bg-violet-50 text-violet-700",
  Meeting: "bg-orange-50 text-orange-600",
  Deadline: "bg-blue-50 text-blue-700",
  Leave: "bg-pink-50 text-pink-700",
  Holiday: "bg-emerald-50 text-emerald-700",
  Birthday: "bg-violet-50 text-violet-700",
  Personal: "bg-emerald-50 text-emerald-700",
};

const normalizeCalendarEvent = (event) => {
  const dateKey = toDateKey(event.date);
  const tone = event.color || (
    event.type === "Deadline" ? "blue" :
    event.type === "Leave" ? "pink" :
    event.type === "Holiday" || event.type === "Company Event" ? "emerald" :
    event.type === "Birthday" ? "violet" :
    "orange"
  );

  return {
    ...event,
    id: event._id || event.id,
    dateKey,
    time: event.startTime === "All Day" ? "All Day" : [event.startTime, event.endTime].filter(Boolean).join(" - "),
    dot: calendarDotStyles[tone] || calendarDotStyles.orange,
    typeClass: calendarTypeStyles[event.type] || calendarTypeStyles.Meeting,
  };
};

const UpcomingEvents = ({ events }) => {
  const [isViewingAll, setIsViewingAll] = useState(false);
  const todayKey = toDateKey(new Date());
  const upcomingEvents = events
    .map(normalizeCalendarEvent)
    .filter((event) => event.dateKey >= todayKey)
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey) || String(first.startTime || "").localeCompare(String(second.startTime || "")));
  const canViewAll = upcomingEvents.length > compactListVisibleRows;
  const listMaxHeight = compactListVisibleRows * 58;
  const modalListMaxHeight = modalListVisibleRows * 58;

  return (
    <section className={`rounded-3xl border border-pink-100 bg-white px-5 py-4 md:rounded-2xl ${dashboardCardShadow}`}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-[#10172a] dark:text-white">
          <span className="text-[#c72fb2]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          Upcoming Events
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-violet-100 px-2 text-xs font-black text-violet-600">
            {upcomingEvents.length}
          </span>
        </h2>
        {canViewAll && (
          <button
            type="button"
            onClick={() => setIsViewingAll(true)}
            className="shrink-0 text-xs font-black text-pink-600 transition hover:text-pink-700"
          >
            View all
          </button>
        )}
      </div>
      <div
        className={`divide-y divide-slate-100 ${canViewAll ? "overflow-y-auto pr-2" : ""}`}
        style={canViewAll ? { maxHeight: `${listMaxHeight}px` } : undefined}
      >
        {upcomingEvents.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-white">
            No upcoming events.
          </p>
        )}
        {upcomingEvents.map((event) => (
          <div key={event.id || `${event.title}-${event.dateKey}`} className="grid grid-cols-[14px_1fr_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={`h-3 w-3 rounded-full ${event.dot}`} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-[#10172a] dark:text-white">
                {event.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500 dark:text-white">
                {formatDate(event.date)} {event.time ? `- ${event.time}` : ""}
              </span>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${event.typeClass}`}>
              {event.type || "Event"}
            </span>
          </div>
        ))}
      </div>

      {isViewingAll && (
        <FloatingListPanel title="Upcoming Events" onClose={() => setIsViewingAll(false)}>
          <div
            className="divide-y divide-slate-100 overflow-y-auto pr-2"
            style={{ maxHeight: `${modalListMaxHeight}px` }}
          >
            {upcomingEvents.map((event) => (
              <div key={event.id || `${event.title}-${event.dateKey}`} className="grid grid-cols-[14px_1fr_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={`h-3 w-3 rounded-full ${event.dot}`} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-[#10172a] dark:text-white">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500 dark:text-white">
                    {formatDate(event.date)} {event.time ? `- ${event.time}` : ""}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${event.typeClass}`}>
                  {event.type || "Event"}
                </span>
              </div>
            ))}
          </div>
        </FloatingListPanel>
      )}
    </section>
  );
};

const OnlineTeam = ({ members }) => {
  const [isViewingAll, setIsViewingAll] = useState(false);
  const canViewAll = members.length > compactListVisibleRows;
  const listMaxHeight = compactListVisibleRows * 54;
  const modalListMaxHeight = modalListVisibleRows * 54;

  const MemberRow = ({ member, index }) => (
    <div key={member._id || member.id || `${member.email}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="relative shrink-0">
        <Avatar name={getUserName(member)} />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black text-[#10172a] dark:text-white">
          {getUserName(member)}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500 dark:text-white">
          {member.role || "Team member"}
        </span>
      </span>
    </div>
  );

  return (
    <section className={`rounded-3xl border border-pink-100 bg-white px-5 py-4 md:rounded-2xl ${dashboardCardShadow}`}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-[#10172a] dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Online Team
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-emerald-100 px-2 text-xs font-black text-emerald-600">
            {members.length}
          </span>
        </h2>
        {canViewAll && (
          <button
            type="button"
            onClick={() => setIsViewingAll(true)}
            className="shrink-0 text-xs font-black text-pink-600 transition hover:text-pink-700"
          >
            View all
          </button>
        )}
      </div>
      <div
        className={`divide-y divide-slate-100 ${canViewAll ? "overflow-y-auto pr-2" : ""}`}
        style={canViewAll ? { maxHeight: `${listMaxHeight}px` } : undefined}
      >
        {members.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-white">
            No team members online.
          </p>
        )}
        {members.map((member, index) => (
          <MemberRow key={member._id || member.id || `${member.email}-${index}`} member={member} index={index} />
        ))}
      </div>

      {isViewingAll && (
        <FloatingListPanel title="Online Team" onClose={() => setIsViewingAll(false)}>
          <div
            className="divide-y divide-slate-100 overflow-y-auto pr-2"
            style={{ maxHeight: `${modalListMaxHeight}px` }}
          >
            {members.map((member, index) => (
              <MemberRow key={member._id || member.id || `${member.email}-${index}`} member={member} index={index} />
            ))}
          </div>
        </FloatingListPanel>
      )}
    </section>
  );
};

const AdminDashboard = ({ activePage = "dashboard" }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [newsfeedActivities, setNewsfeedActivities] = useState([]);
  const [onlineTeam, setOnlineTeam] = useState([]);
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
        const results = await Promise.allSettled([
          taskAPI.getAll({ limit: 100 }),
          employeeAPI.getAll({ limit: 100 }),
          clientAPI.getAll({ limit: 100 }),
          budgetAPI.getAll({ limit: 100 }),
          newsfeedAPI.getActivity({ limit: 20 }),
          authAPI.getOnlineTeam(),
          calendarAPI.getAll({ month: getCurrentMonthKey() }),
          calendarAPI.getAll({ month: getNextMonthKey() }),
        ]);

        const valueAt = (index, fallback) => results[index]?.status === "fulfilled" ? results[index].value : fallback;
        const allTasks = valueAt(0, []);
        const allEmployees = valueAt(1, []);
        const allClients = valueAt(2, []);
        const allBudgetEntries = valueAt(3, []);
        const newsfeedActivity = valueAt(4, []);
        const onlineMembers = valueAt(5, []);
        const currentMonthEvents = valueAt(6, []);
        const nextMonthEvents = valueAt(7, []);
        const failedRequests = results.filter((result) => result.status === "rejected");

        if (!isMounted) {
          return;
        }

        setTasks(Array.isArray(allTasks) ? allTasks : []);
        setEmployees(Array.isArray(allEmployees) ? allEmployees : []);
        setClients(Array.isArray(allClients) ? allClients : []);
        setBudgetEntries(Array.isArray(allBudgetEntries) ? allBudgetEntries : []);
        setCalendarEvents([
          ...(Array.isArray(currentMonthEvents) ? currentMonthEvents : []),
          ...(Array.isArray(nextMonthEvents) ? nextMonthEvents : []),
        ]);
        setNewsfeedActivities(Array.isArray(newsfeedActivity) ? newsfeedActivity : []);
        setOnlineTeam(Array.isArray(onlineMembers) ? onlineMembers : []);
        setTaskStatusCounts(
          (Array.isArray(allTasks) ? allTasks : []).reduce((counts, task) => {
            const status = task?.status;
            if (status) counts[status] = (counts[status] || 0) + 1;
            return counts;
          }, {}),
        );
        setLoadError(
          failedRequests.length
            ? `${failedRequests.length} dashboard request${failedRequests.length === 1 ? "" : "s"} could not be loaded. Available data is shown; refresh to retry.`
            : "",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(getApiErrorMessage(error, "Unable to load dashboard data."));
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
        <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] space-y-3 bg-[#fbf9ff] px-3 py-3 dark:bg-neutral-950 md:-mx-5 md:space-y-4 md:bg-[#f8f9fd] md:px-5 md:py-4 lg:-mx-6 lg:px-6">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loadError}
            </div>
          )}

          {activeTopTab === "dashboard" && (
            <>
              <header className="pb-1">
                <p className="text-sm font-black text-[#10172a] dark:text-white">
           
                  Welcome back, {getUserName(user)}!
                </p>
                <h1
                  className="mt-1 text-2xl uppercase leading-none text-neutral-950 dark:text-white md:text-3xl"
                  style={{ fontFamily: "var(--font-bruno)" }}
                >
                  Dashboard
                </h1>
              </header>

              <div className="grid grid-cols-4 gap-2 md:gap-4 xl:grid-cols-4">
                {stats.map((item) => (
                  <StatCard key={item.label} item={item} />
                ))}
              </div>

              <div className="grid gap-3 md:gap-4 xl:grid-cols-[1.85fr_0.82fr]">
                <MonthlyChart tasks={tasks} />
                <ExpenseChart budgetEntries={budgetEntries} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-2">
                <EmployeeTable title="Working" employees={workingEmployees} />
                <EmployeeTable title="Not Working" employees={notWorkingEmployees} tone="pink" />
              </div>

              <div className="grid gap-3 md:gap-4 xl:grid-cols-3">
                <UpcomingEvents events={calendarEvents} />
                <OnlineTeam members={onlineTeam} />
                <RecentActivities
                  budgetEntries={budgetEntries}
                  calendarEvents={calendarEvents}
                  clients={clients}
                  employees={employees}
                  newsfeedActivities={newsfeedActivities}
                  tasks={tasks}
                />
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
