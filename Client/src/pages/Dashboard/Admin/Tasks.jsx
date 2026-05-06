import { useMemo, useState } from "react";
import CLIENTRA2 from "../../../assets/CLIENTRA2.png";
import peejong from "../../../assets/peejong.png";

const navItems = [
  { id: "dashboard", label: "Home", icon: "dashboard" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "client", label: "Client", icon: "client" },
  { id: "employee", label: "Employee", icon: "employee" },
];

const initialTasks = [
  {
    id: 1,
    title: "Complete project proposal",
    description: "Draft and finalize the project proposal for the new client",
    dueDate: "12/27/2025",
    status: "Pending",
  },
  {
    id: 2,
    title: "Team meeting",
    description: "Weekly sync with the development team",
    dueDate: "12/16/2025",
    status: "In progress",
  },
];

const taskStatuses = ["All", "In progress", "Pending", "Done", "In review"];
const dateStatuses = ["All", "Today", "Week", "Overdue"];

const formatInputDate = (date) => date.toISOString().slice(0, 10);

const toInputDate = (date) => {
  const [month, day, year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const toDisplayDate = (date) => {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
};

const getDateStatus = (dueDate) => {
  const today = new Date();
  const due = new Date(toInputDate(dueDate));
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDifference = (dueStart - todayStart) / 86400000;

  if (dayDifference < 0) return "Overdue";
  if (dayDifference === 0) return "Today";
  if (dayDifference <= 7) return "Week";
  return "Upcoming";
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "dashboard") {
    return (
      <svg {...commonProps}>
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg {...commonProps}>
        <path
          d="M8 4h8l1 3H7l1-3zM6 7h12v13H6zM9 12l1.5 1.5L14 10M9 17h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "budget") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "client" || name === "employee") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M12.5 18.5c.6-2.4 2.1-3.7 4.4-3.7 2.4 0 3.9 1.3 4.4 3.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...commonProps}>
        <path
          d="M4 5h16l-6.2 7.2v5.3L10.2 19v-6.8L4 5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <path
          d="M7 3v4M17 3v4M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...commonProps}>
        <path
          d="m14.7 5.3 4 4M4 20l4.4-1 10.2-10.2a2.8 2.8 0 0 0-4-4L4.4 15 4 20z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...commonProps}>
        <path
          d="M9 5H5v14h4M15 8l4 4-4 4M19 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const FilterChip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-7 rounded-md px-3 text-xs font-medium shadow-[0_2px_5px_rgba(0,0,0,0.2)] transition ${
      active
        ? "bg-[#db4ab5] text-white"
        : "bg-white text-neutral-700 hover:bg-pink-50 hover:text-[#c72fb2]"
    }`}
  >
    {children}
  </button>
);

const Sidebar = ({ activePage = "tasks", onLogout, onNavigate }) => (
  <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[230px] border-r border-neutral-300 bg-[#eeeeee] md:flex md:flex-col">
    <div className="border-b border-neutral-300 px-4 py-4">
      <div className="flex items-center gap-2">
        <img src={CLIENTRA2} alt="Clientra" className="h-10 w-10 object-contain" />
        <span
          className="text-xl uppercase text-neutral-950"
          style={{ fontFamily: "var(--font-bruno)" }}
        >
          Clientra
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-neutral-700">
        Business Management
      </p>
    </div>

    <nav className="flex flex-1 flex-col gap-4 px-3 pt-10">
      {navItems.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onNavigate?.(item.id)}
          className={`flex h-11 items-center gap-4 rounded-lg px-6 text-sm font-medium transition ${
            activePage === item.id
              ? "bg-linear-to-r from-[#8424d2] to-[#e347b3] text-white shadow-[0_4px_7px_rgba(126,34,206,0.35)]"
              : "text-neutral-700 hover:bg-white hover:text-[#c72fb2]"
          }`}
        >
          <Icon name={item.icon} className="h-6 w-6 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>

    <button
      type="button"
      onClick={onLogout}
      className="mb-8 ml-12 flex items-center gap-10 text-sm text-white transition hover:text-[#c72fb2]"
    >
      <span>Log out</span>
      <Icon name="logout" className="h-6 w-6" />
    </button>
  </aside>
);

const TaskCard = ({ onEdit, onToggleDone, task }) => (
  <article className="flex min-h-[95px] items-center gap-4 rounded-lg bg-white px-4 py-4 shadow-[0_3px_4px_rgba(190,65,158,0.35)] ring-1 ring-pink-50 sm:px-5">
    <button
      type="button"
      onClick={() => onToggleDone(task.id)}
      className={`h-5 w-5 shrink-0 rounded-full border transition hover:border-[#c72fb2] ${
        task.status === "Done"
          ? "border-[#c72fb2] bg-[#c72fb2]"
          : "border-neutral-400 bg-white"
      }`}
      aria-label={`Mark ${task.title} complete`}
    />

    <div className="min-w-0 flex-1">
      <h2 className="truncate text-sm font-semibold text-neutral-800">
        {task.title}
      </h2>
      <p className="mt-1 text-xs text-neutral-800">{task.description}</p>
      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-neutral-800">
        <Icon name="calendar" className="h-4 w-4" />
        {task.dueDate}
      </p>
    </div>

    <button
      type="button"
      onClick={() => onEdit(task)}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-neutral-900 transition hover:bg-pink-50 hover:text-[#c72fb2]"
      aria-label={`Edit ${task.title}`}
    >
      <Icon name="edit" className="h-5 w-5" />
    </button>
  </article>
);

const Tasks = ({ activePage = "tasks", onLogout, onNavigate }) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedDateStatus, setSelectedDateStatus] = useState("All");

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesTaskStatus =
        selectedTaskStatus === "All" || task.status === selectedTaskStatus;
      const matchesDateStatus =
        selectedDateStatus === "All" || getDateStatus(task.dueDate) === selectedDateStatus;

      return matchesTaskStatus && matchesDateStatus;
    });
  }, [selectedDateStatus, selectedTaskStatus, tasks]);

  const handleAddTask = () => {
    const title = window.prompt("Task title");

    if (!title?.trim()) {
      return;
    }

    const description =
      window.prompt("Task description", "Add task details here") ||
      "Add task details here";
    const dueDate =
      window.prompt("Due date (YYYY-MM-DD)", formatInputDate(new Date())) ||
      formatInputDate(new Date());
    const status =
      window.prompt("Status: In progress, Pending, Done, In review", "Pending") ||
      "Pending";

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        dueDate: toDisplayDate(dueDate),
        status,
      },
    ]);
  };

  const handleEditTask = (task) => {
    const title = window.prompt("Task title", task.title);

    if (!title?.trim()) {
      return;
    }

    const description =
      window.prompt("Task description", task.description) || task.description;
    const dueDate =
      window.prompt("Due date (YYYY-MM-DD)", toInputDate(task.dueDate)) ||
      toInputDate(task.dueDate);
    const status = window.prompt(
      "Status: In progress, Pending, Done, In review",
      task.status
    ) || task.status;

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              title: title.trim(),
              description: description.trim(),
              dueDate: toDisplayDate(dueDate),
              status,
            }
          : currentTask
      )
    );
  };

  const handleToggleDone = (taskId) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === "Done" ? "Pending" : "Done" }
          : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <Sidebar
        activePage={activePage}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="px-4 pb-12 pt-8 md:ml-[230px] md:px-10 lg:px-12">
        <div className="mx-auto max-w-[1060px]">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Task
              </h1>
              <p className="mt-2 text-xs font-medium text-neutral-600">
                Assign and manage your task
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-11 items-center gap-3 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-5 text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Task</span>
              </button>

              <div className="h-12 w-px bg-neutral-300" />

              <img
                src={peejong}
                alt="User"
                className="h-10 w-10 rounded-full bg-slate-200 object-cover"
              />
            </div>
          </header>

          <section className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="filter" className="h-5 w-5 text-neutral-900" />
              <span className="text-xs font-medium text-neutral-700">Status:</span>
              {taskStatuses.map((status) => (
                <FilterChip
                  key={status}
                  active={selectedTaskStatus === status}
                  onClick={() => setSelectedTaskStatus(status)}
                >
                  {status}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Icon name="calendar" className="h-5 w-5 text-neutral-900" />
              <span className="text-xs font-medium text-neutral-700">Status:</span>
              {dateStatuses.map((status) => (
                <FilterChip
                  key={status}
                  active={selectedDateStatus === status}
                  onClick={() => setSelectedDateStatus(status)}
                >
                  {status}
                </FilterChip>
              ))}
            </div>
          </section>

          <section className="mt-4 space-y-5">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                onEdit={handleEditTask}
                onToggleDone={handleToggleDone}
                task={task}
              />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Tasks;
