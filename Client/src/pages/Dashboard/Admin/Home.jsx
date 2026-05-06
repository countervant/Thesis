import { useEffect, useRef, useState } from "react";
import CLIENTRA2 from "../../../assets/CLIENTRA2.png";
import peejong from "../../../assets/peejong.png";
import progress from "../../../assets/progress.png";
import pending from "../../../assets/pending.png";
import review from "../../../assets/review.png";
import done from "../../../assets/done.png";

const navItems = [
  { id: "dashboard", label: "Home", icon: "grid" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "client", label: "Client", icon: "client" },
  { id: "employee", label: "Employee", icon: "employee" },
];

const stats = [
  { label: "In Progress", value: 1, icon: "progress" },
  { label: "Pending", value: 4, icon: "pending" },
  { label: "In Review", value: 3, icon: "review" },
  { label: "Done", value: 0, icon: "done" },
];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthlyData = [
  [88, 45, 18],
  [55, 38, 40],
  [44, 56, 33],
  [50, 22, 17],
  [80, 15, 98],
  [48, 33, 88],
  [78, 48, 12],
  [47, 50, 24],
  [92, 84, 42],
  [34, 41, 47],
  [28, 32, 75],
  [85, 12, 12],
];

const expenseCategories = [
  { label: "Groceries", value: 150, color: "#d64ab2" },
  { label: "Bills", value: 100.95, color: "#9228c9" },
];

const employees = [
  {
    name: "Van Dev",
    job: "ewan ko sa kanya",
    client: "Peejong",
    date: "wala siyang kadate",
  },
  {
    name: "Peejong",
    job: "Saktan sarili niya",
    client: "ewan ko sa kanya",
    date: "iniwan siya ng ka date niya",
  },
  {
    name: "John Doe",
    job: "Video Editor",
    client: "Client Name",
    date: "May 5, 2026",
  },
];

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

const StatCard = ({ item }) => (
  <section className="flex h-24 items-center gap-5 rounded-lg bg-white px-5 shadow-[0_2px_6px_rgba(219,39,119,0.28)] ring-1 ring-pink-100">
    <Icon name={item.icon} className="h-14 w-14 shrink-0 text-[#dc4bb2]" />
    <div className="leading-tight">
      <p className="text-4xl font-bold text-neutral-950">{item.value}</p>
      <p className="text-base text-neutral-500">{item.label}</p>
    </div>
  </section>
);

const MonthlyChart = () => (
  <section className="rounded-lg bg-white px-9 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
    <h2 className="mb-11 text-lg font-bold text-neutral-950">
      Monthly Overview
    </h2>
    <div className="flex min-h-40 items-end gap-3 border-b border-l border-dashed border-slate-200 px-2 pt-2">
      {monthlyData.map((group, index) => (
        <div
          key={months[index]}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <div className="flex h-32 w-full items-end justify-center gap-1 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_8px,#f0f0f5_8px,#f0f0f5_9px)]">
            {group.map((value, barIndex) => (
              <div
                key={`${months[index]}-${barIndex}`}
                className={`w-2 rounded-t-sm ${barIndex === 0 ? "bg-[#9281ff]" : barIndex === 1 ? "bg-[#d64ab2]" : "bg-[#8d2bc8]"}`}
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
          <span className="-rotate-45 whitespace-nowrap text-[10px] text-neutral-500">
            {months[index]}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-10 flex justify-center gap-5 text-xs text-neutral-500">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 bg-[#9281ff]" />
        2023
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 bg-[#d64ab2]" />
        2024
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 bg-[#8d2bc8]" />
        2025
      </span>
    </div>
  </section>
);

const ExpenseChart = () => {
  const total = expenseCategories.reduce((sum, category) => sum + category.value, 0);
  const { stops: gradientStops, labels: chartLabels } = expenseCategories.reduce(
    (result, category) => {
      const start = result.currentPercent;
      const end = total > 0 ? start + (category.value / total) * 100 : start;
      const middle = start + (end - start) / 2;
      const radians = (middle * 3.6 - 90) * (Math.PI / 180);
      const radius = 23;

      return {
        currentPercent: end,
        stops: [...result.stops, `${category.color} ${start}% ${end}%`],
        labels: [
          ...result.labels,
          {
            ...category,
            x: 50 + Math.cos(radians) * radius,
            y: 50 + Math.sin(radians) * radius,
          },
        ],
      };
    },
    { currentPercent: 0, stops: [], labels: [] }
  );

  return (
    <section className="rounded-lg bg-white px-6 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
      <h2 className="mb-4 text-lg font-bold text-neutral-950">
        Expense Categories
      </h2>
      <div
        className="relative mx-auto h-56 w-56 rounded-full"
        style={{ background: `conic-gradient(${gradientStops.join(", ")})` }}
      >
        {chartLabels.map((category) => (
          <span
            key={category.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-semibold leading-tight text-white"
            style={{ left: `${category.x}%`, top: `${category.y}%` }}
          >
            {category.label}
            <br />
            {category.value.toFixed(2)}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2 text-xs text-neutral-500">
        {expenseCategories.map((category) => (
          <span key={category.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.label}
          </span>
        ))}
      </div>
    </section>
  );
};

const EmployeeTable = ({ title }) => (
  <section className="overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
    <div className="px-7 pt-5">
      <h2 className="text-lg font-bold text-neutral-950">{title}</h2>
    </div>
    <table className="mt-1 w-full text-left text-xs text-neutral-900">
      <thead className="border-b border-slate-100 text-neutral-700">
        <tr>
          <th className="w-16 px-5 py-3 font-medium">Employee</th>
          <th className="px-3 py-3 font-medium">Job</th>
          <th className="px-3 py-3 font-medium">Client</th>
          <th className="px-3 py-3 font-medium">Date</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee, index) => (
          <tr key={`${title}-${index}`}>
            <td className="px-5 py-2">
              <div className="flex items-center gap-4">
                <Avatar />
                <span>{employee.name}</span>
              </div>
            </td>
            <td className="px-3 py-2">{employee.job}</td>
            <td className="px-3 py-2">{employee.client}</td>
            <td className="px-3 py-2">{employee.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const AdminDashboard = ({ activePage = "dashboard", onLogout, onNavigate }) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-300 bg-[#f5f5f5] px-4">
        <div className="flex items-center gap-2">
          <img
            src={CLIENTRA2}
            alt="Clientra"
            className="h-10 w-10 object-contain"
          />
          <span
            style={{
              fontFamily: "'Bruno Ace SC', sans-serif",
              fontSize: "30px",
            }}
          >
            Clientra Ni Peejong 
          </span>
        </div>

        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-neutral-900 shadow-sm transition hover:border-pink-200 hover:text-[#c72fb2]"
            aria-label="Account menu"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <img
              src={peejong}
              alt="User"
              className="h-8 w-8 rounded-full object-cover"
            />
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d="m6 8 4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isAccountMenuOpen && (
            <div
              className="absolute right-0 top-14 z-40 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-sm text-neutral-800 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                role="menuitem"
              >
                Profile
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                role="menuitem"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-[90px] border-r border-neutral-300 bg-[#f5f5f5] md:block">
        <nav className="flex flex-col items-center gap-5 pt-9">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex w-16 flex-col items-center gap-1 rounded-xl py-3 text-xs transition ${
                activePage === item.id
                  ? "bg-linear-to-b from-[#df4bb4] to-[#7e22ce] text-white shadow-[0_4px_8px_rgba(126,34,206,0.35)]"
                  : "text-neutral-900 hover:bg-white hover:text-[#c72fb2]"
              }`}
            >
              <Icon name={item.icon} className="h-6 w-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="px-4 pb-10 pt-24 md:ml-[90px] md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
            <MonthlyChart />
            <ExpenseChart />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <EmployeeTable title="Working" />
            <EmployeeTable title="Not Working" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
