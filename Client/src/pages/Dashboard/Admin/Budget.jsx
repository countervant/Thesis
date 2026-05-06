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

const entries = [
  {
    id: 1,
    type: "income",
    description: "Monthly salary",
    category: "Salary",
    date: "12/26/2025",
    amount: 5000,
  },
  {
    id: 2,
    type: "expense",
    description: "Office rent",
    category: "Rent",
    date: "12/26/2025",
    amount: -1200,
  },
  {
    id: 3,
    type: "expense",
    description: "Software subscriptions",
    category: "Software",
    date: "12/26/2025",
    amount: -350,
  },
  {
    id: 4,
    type: "income",
    description: "Freelance project",
    category: "Freelance",
    date: "12/26/2025",
    amount: 2500,
  },
];

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "dashboard") {
    return (
      <svg {...props}>
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
      <svg {...props}>
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
      <svg {...props}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "client" || name === "employee") {
    return (
      <svg {...props}>
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

  if (name === "money") {
    return (
      <svg {...props}>
        <circle cx="11" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M11 8v8M8.8 14.6c.7.8 3.6.8 4.1-.3.6-1.4-1.7-1.9-3-2.3-1.4-.4-1.7-2.7.3-3.2 1-.2 2.2.1 2.8.8M17 4l2-1M17 7h3M16.7 10l2 1.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...props}>
        <path
          d="M4 8.5h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 13h5v3h-5a1.5 1.5 0 0 1 0-3zM6 5l10 3.5"
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
      <svg {...props}>
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

  if (name === "trash") {
    return (
      <svg {...props}>
        <path
          d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6"
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
      <svg {...props}>
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

  if (name === "down") {
    return (
      <svg {...props}>
        <path
          d="M7 7h10v10M17 17 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const Sidebar = ({ activePage = "budget", onLogout, onNavigate }) => (
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
          key={item.id}
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

const SummaryCard = ({ icon, label, value }) => (
  <section className="flex h-20 items-center justify-center gap-8 rounded-lg bg-white px-5 shadow-[0_3px_4px_rgba(219,39,119,0.35)] ring-1 ring-pink-50">
    <Icon name={icon} className="h-10 w-10 text-[#e347b3]" />
    <div className="text-center leading-tight">
      <p className="text-3xl font-bold text-neutral-950">{value}</p>
      <p className="text-base text-neutral-500">{label}</p>
    </div>
  </section>
);

const ExpenseBreakdown = ({ expenses, income }) => {
  const maxValue = Math.max(income, expenses, 1);
  const expenseHeight = `${Math.max((expenses / maxValue) * 100, 8)}%`;
  const incomeHeight = `${Math.max((income / maxValue) * 100, 8)}%`;

  return (
  <section className="rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50">
    <h2 className="text-lg font-bold text-neutral-900">Expense Breakdown</h2>
    <div className="mt-7 flex items-end gap-4">
      <div className="flex h-28 flex-col justify-between text-xs text-neutral-500">
        <span>8,000</span>
        <span>6,000</span>
        <span>4,000</span>
        <span>2,000</span>
        <span>0</span>
      </div>
      <div className="relative flex h-28 flex-1 items-end justify-center gap-5 border-b border-neutral-300 bg-[repeating-linear-gradient(to_bottom,#d9d9d9_0,#d9d9d9_1px,transparent_1px,transparent_19px)]">
        <div className="w-24 bg-[#ff1f14]" style={{ height: expenseHeight }} />
        <div className="w-24 bg-[#18a64f]" style={{ height: incomeHeight }} />
        <span className="absolute -bottom-5 text-xs text-neutral-400">Dec 25</span>
      </div>
    </div>
    <div className="mt-9 flex justify-center gap-16 text-xs text-neutral-700">
      <span className="flex items-center gap-2">
        <span className="h-3 w-6 bg-[#ff1f14]" />
        Expenses
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-6 bg-[#18a64f]" />
        Income
      </span>
    </div>
  </section>
  );
};

const ExpenseCategories = ({ entries }) => {
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const categories = expenseEntries.reduce((result, entry) => {
    return {
      ...result,
      [entry.category]: (result[entry.category] || 0) + Math.abs(entry.amount),
    };
  }, {});
  const categoryList = Object.entries(categories);
  const total = categoryList.reduce((sum, [, value]) => sum + value, 0);
  const firstPercent = total > 0 ? (categoryList[0]?.[1] || 0) / total * 100 : 50;

  return (
  <section className="rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50">
    <h2 className="text-lg font-bold text-neutral-900">Expense Categories</h2>
    <div className="mt-3 flex flex-col items-center">
      <div
        className="relative h-36 w-36 rounded-full"
        style={{
          background: `conic-gradient(#8d2bc8 0 ${firstPercent}%, #d947b3 ${firstPercent}% 100%)`,
        }}
      >
        <span className="absolute left-8 top-16 text-center text-[10px] font-semibold leading-tight text-white">
          {categoryList[0]?.[0] || "None"}
          <br />
          {(categoryList[0]?.[1] || 0).toFixed(2)}
        </span>
        <span className="absolute right-8 top-16 text-center text-[10px] font-semibold leading-tight text-white">
          {categoryList[1]?.[0] || "Other"}
          <br />
          {(categoryList[1]?.[1] || 0).toFixed(2)}
        </span>
      </div>
      <div className="mt-5 space-y-2 self-center text-xs text-neutral-500">
        {categoryList.slice(0, 2).map(([category], index) => (
          <span key={category} className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                index === 0 ? "bg-[#8d5cff]" : "bg-[#ff7b7b]"
              }`}
            />
            {category}
          </span>
        ))}
      </div>
    </div>
  </section>
  );
};

const EntryType = ({ type }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
      type === "income"
        ? "bg-[#6bed9c] text-[#12853d]"
        : "bg-[#ff7d7d] text-[#b31a1a]"
    }`}
  >
    <Icon name="down" className="h-3 w-3" />
    {type}
  </span>
);

const formatCurrency = (amount) => {
  const absoluteAmount = Math.abs(amount).toLocaleString("en-US");
  return `${amount < 0 ? "-" : "+"}$${absoluteAmount}`;
};

const Budget = ({ activePage = "budget", onLogout, onNavigate }) => {
  const [budgetEntries, setBudgetEntries] = useState(entries);

  const totals = useMemo(() => {
    const income = budgetEntries
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = budgetEntries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    return {
      balance: income - expenses,
      expenses,
      income,
    };
  }, [budgetEntries]);

  const addEntry = () => {
    const type = window.prompt("Type: income or expense", "expense") || "expense";
    const normalizedType = type.toLowerCase() === "income" ? "income" : "expense";
    const description = window.prompt("Description", "New entry");

    if (!description?.trim()) {
      return;
    }

    const category = window.prompt("Category", "General") || "General";
    const date = window.prompt("Date (MM/DD/YYYY)", "12/26/2025") || "12/26/2025";
    const amountValue = Number(window.prompt("Amount", "1")) || 1;

    setBudgetEntries((currentEntries) => [
      ...currentEntries,
      {
        id: Date.now(),
        type: normalizedType,
        description: description.trim(),
        category: category.trim(),
        date,
        amount:
          normalizedType === "expense"
            ? -Math.abs(amountValue)
            : Math.abs(amountValue),
      },
    ]);
  };

  const editEntry = (entry) => {
    const type = window.prompt("Type: income or expense", entry.type) || entry.type;
    const normalizedType = type.toLowerCase() === "income" ? "income" : "expense";
    const description = window.prompt("Description", entry.description);

    if (!description?.trim()) {
      return;
    }

    const category = window.prompt("Category", entry.category) || entry.category;
    const date = window.prompt("Date (MM/DD/YYYY)", entry.date) || entry.date;
    const amountValue =
      Number(window.prompt("Amount", String(Math.abs(entry.amount)))) ||
      Math.abs(entry.amount);

    setBudgetEntries((currentEntries) =>
      currentEntries.map((currentEntry) =>
        currentEntry.id === entry.id
          ? {
              ...currentEntry,
              type: normalizedType,
              description: description.trim(),
              category: category.trim(),
              date,
              amount:
                normalizedType === "expense"
                  ? -Math.abs(amountValue)
                  : Math.abs(amountValue),
            }
          : currentEntry
      )
    );
  };

  const deleteEntry = (entryId) => {
    if (window.confirm("Delete this entry?")) {
      setBudgetEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== entryId)
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <Sidebar
        activePage={activePage}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="px-4 pb-10 pt-8 md:ml-[230px] md:px-10 lg:px-12">
        <div className="mx-auto max-w-[1060px]">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Budget Planner
              </h1>
              <p className="mt-2 text-xs font-medium text-neutral-600">
                Track your income and expenses
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addEntry}
                className="flex h-11 items-center gap-3 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-5 text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
              <div className="h-12 w-px bg-neutral-300" />
              <img
                src={peejong}
                alt="User"
                className="h-10 w-10 rounded-full bg-slate-200 object-cover"
              />
            </div>
          </header>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon="money"
              label="Total Income"
              value={`$${totals.income.toLocaleString("en-US")}`}
            />
            <SummaryCard
              icon="money"
              label="Total Expense"
              value={`$${totals.expenses.toLocaleString("en-US")}`}
            />
            <SummaryCard
              icon="wallet"
              label="Balance"
              value={`$${totals.balance.toLocaleString("en-US")}`}
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <ExpenseBreakdown expenses={totals.expenses} income={totals.income} />
            <ExpenseCategories entries={budgetEntries} />
          </section>

          <section className="mt-4 overflow-hidden rounded-lg bg-white shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50">
            <table className="w-full min-w-[780px] text-left text-xs text-neutral-800">
              <thead className="border-b border-neutral-300">
                <tr>
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Description</th>
                  <th className="px-5 py-4 font-medium">Category</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgetEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-4">
                      <EntryType type={entry.type} />
                    </td>
                    <td className="px-5 py-4 font-medium">{entry.description}</td>
                    <td className="px-5 py-4">{entry.category}</td>
                    <td className="px-5 py-4 text-neutral-500">{entry.date}</td>
                    <td
                      className={`px-5 py-4 font-bold ${
                        entry.amount < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => editEntry(entry)}
                          className="text-neutral-900 transition hover:text-[#c72fb2]"
                          aria-label={`Edit ${entry.description}`}
                        >
                          <Icon name="edit" className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-600 transition hover:text-red-700"
                          aria-label={`Delete ${entry.description}`}
                        >
                          <Icon name="trash" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Budget;
