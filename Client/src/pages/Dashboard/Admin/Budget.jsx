import { useEffect, useMemo, useState } from "react";
import { budgetAPI } from "../../../services/api.js";

const formatInputDate = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const normalizeEntry = (entry) => ({
  id: entry._id || entry.id,
  type: entry.type || "expense",
  description: entry.description || "",
  category: entry.category || "",
  date: formatDisplayDate(entry.date),
  inputDate: formatInputDate(entry.date),
  amount:
    entry.type === "expense"
      ? -Math.abs(Number(entry.amount) || 0)
      : Math.abs(Number(entry.amount) || 0),
});

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
  const axisLabels = [1, 0.75, 0.5, 0.25, 0].map((multiplier) =>
    Math.round(maxValue * multiplier).toLocaleString("en-US")
  );

  return (
  <section className="flex min-h-[315px] flex-col rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50">
    <h2 className="text-lg font-bold text-neutral-900">Expense Breakdown</h2>
    <div className="mt-6 flex flex-1 items-end gap-4">
      <div className="flex h-52 w-12 flex-col justify-between text-right text-xs text-neutral-500">
        {axisLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="relative flex h-52 flex-1 items-end justify-center gap-8 border-b border-neutral-300 bg-[repeating-linear-gradient(to_bottom,#d9d9d9_0,#d9d9d9_1px,transparent_1px,transparent_52px)] px-8">
        <div
          className="w-24 max-w-[34%] rounded-t-sm bg-[#ff1f14]"
          style={{ height: expenseHeight }}
          title={`Expenses: ${expenses.toLocaleString("en-US")}`}
        />
        <div
          className="w-24 max-w-[34%] rounded-t-sm bg-[#18a64f]"
          style={{ height: incomeHeight }}
          title={`Income: ${income.toLocaleString("en-US")}`}
        />
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
  const colors = ["#8d2bc8", "#d947b3", "#6d5dfc", "#f05f9f"];
  const segments = categoryList.slice(0, 4).reduce(
    (result, [category, value], index) => {
      const start = result.currentPercent;
      const percent = total > 0 ? (value / total) * 100 : 0;
      const end = start + percent;
      const middle = start + percent / 2;
      const radians = (middle * 3.6 - 90) * (Math.PI / 180);
      const radius = 24;

      return {
        currentPercent: end,
        items: [
          ...result.items,
          {
            category,
            value,
            color: colors[index % colors.length],
            end,
            start,
            x: 50 + Math.cos(radians) * radius,
            y: 50 + Math.sin(radians) * radius,
          },
        ],
      };
    },
    { currentPercent: 0, items: [] }
  ).items;
  const chartBackground =
    segments.length > 0
      ? `conic-gradient(${segments
          .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
          .join(", ")})`
      : "conic-gradient(#8d2bc8 0 50%, #d947b3 50% 100%)";

  return (
  <section className="rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50">
    <h2 className="text-lg font-bold text-neutral-900">Expense Categories</h2>
    <div className="mt-4 flex flex-col items-center">
      <div
        className="relative h-44 w-44 shrink-0 rounded-full sm:h-52 sm:w-52"
        style={{ background: chartBackground }}
      >
        {segments.length === 0 && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-xs font-semibold leading-tight text-white">
            None
          </span>
        )}
        {segments.map((segment) => (
          <span
            key={segment.category}
            className="absolute max-w-[72px] -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-semibold leading-none text-white"
            style={{ left: `${segment.x}%`, top: `${segment.y}%` }}
          >
            <span className="block truncate">{segment.category}</span>
            <span className="block">{segment.value.toFixed(2)}</span>
          </span>
        ))}
      </div>
      <div className="mt-5 grid w-full grid-cols-2 gap-x-5 gap-y-2 text-xs text-neutral-600 sm:grid-cols-4">
        {segments.map((segment) => (
          <span key={segment.category} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 truncate">{segment.category}</span>
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

const Budget = ({ onAddEntry, onEditEntry, refreshKey = 0 }) => {
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadBudgets = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await budgetAPI.getAll();

        if (isMounted) {
          setBudgetEntries(Array.isArray(data) ? data.map(normalizeEntry) : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load budget entries."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBudgets();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

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

  const deleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) {
      return;
    }

    try {
      setErrorMessage("");
      await budgetAPI.delete(entryId);
      setBudgetEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== entryId)
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete budget entry.");
    }
  };

  return (
        <div className="mx-auto max-w-[1500px]">
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
                onClick={onAddEntry}
                className="flex h-11 items-center gap-3 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-5 text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
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

          {errorMessage && (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

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
                {isLoading && (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center font-medium text-neutral-600">
                      Loading budget entries...
                    </td>
                  </tr>
                )}

                {!isLoading && budgetEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center font-medium text-neutral-600">
                      No budget entries found.
                    </td>
                  </tr>
                )}

                {!isLoading && budgetEntries.map((entry) => (
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
                          onClick={() => onEditEntry?.(entry)}
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
  );
};

export default Budget;
