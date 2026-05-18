import { useEffect, useMemo, useState } from "react";
import { budgetAPI, getApiErrorMessage } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import balanceIcon from "../../../assets/balance.png";
import totalExpenseIcon from "../../../assets/totalexpense.png";
import totalIncomeIcon from "../../../assets/totalincome.png";
import walletIcon from "../../../assets/wallet.png";
import {
  BudgetChartsSkeleton,
  BudgetSummarySkeleton,
  SkeletonRows,
} from "../../../components/Skeleton.jsx";

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

const formatPeso = (amount, { signed = false } = {}) => {
  const formattedAmount = new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Math.abs(Number(amount) || 0));

  if (!signed) return formattedAmount;
  return `${amount < 0 ? "-" : "+"}${formattedAmount}`;
};

const getMonthKey = (value) => {
  const inputDate = formatInputDate(value);
  return inputDate.slice(0, 7);
};

const getCurrentMonthKey = () => getMonthKey(new Date());

const getLastMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return getMonthKey(date);
};

const getPreviousMonthKey = (monthKey) => {
  const [year, month] = String(monthKey).split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return getMonthKey(date);
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return "Unknown Month";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const budgetIcons = {
  balance: balanceIcon,
  expense: totalExpenseIcon,
  income: totalIncomeIcon,
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const imageIcon = budgetIcons[name];

  if (imageIcon) {
    return <img src={imageIcon} alt="" className={className} aria-hidden="true" />;
  }

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
     <img src={walletIcon} alt="Wallet" className={className} /> 
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

  if (name === "income-arrow" || name === "expense-arrow") {
    const isIncome = name === "income-arrow";

    return (
      <svg {...props}>
        <path
          d={isIncome ? "M7 17 17 7M9 7h8v8" : "M7 7l10 10M17 9v8H9"}
          stroke="currentColor"
          strokeWidth="3"
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

const SummaryCard = ({ icon, label, note = "This month", noteClass = "text-slate-500", value }) => (
  <section className="flex h-28 items-center gap-5 rounded-2xl border border-pink-100 bg-white px-6 shadow-[0_8px_24px_rgba(190,65,158,0.08)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800">
    <span className="grid h-15 w-15 place-items-center rounded-2xl bg-pink-50">
      <Icon name={icon} className="h-10 w-10" />
    </span>
    <div className="min-w-0 leading-tight">
      <p className="text-[11px] font-black uppercase text-slate-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#10142d] dark:text-white">{value}</p>
      <p className={`mt-2 text-xs font-black ${noteClass}`}>{note}</p>
    </div>
  </section>
);

const IncomeExpenseChart = ({ expenses, income, monthLabel, monthOptions, onMonthChange, selectedMonth }) => {
  const maxValue = Math.max(income, expenses, 1);
  const expenseHeight = `${Math.max((expenses / maxValue) * 100, expenses > 0 ? 8 : 0)}%`;
  const incomeHeight = `${Math.max((income / maxValue) * 100, income > 0 ? 8 : 0)}%`;
  const axisLabels = [1, 0.75, 0.5, 0.25, 0].map((multiplier) =>
    formatPeso(Math.round(maxValue * multiplier))
  );

  return (
  <section className="flex min-h-[300px] flex-col rounded-2xl border border-pink-100 bg-white px-6 py-5 shadow-[0_8px_24px_rgba(190,65,158,0.08)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-black text-[#10142d] dark:text-white">Income vs Expense</h2>
      <label className="relative">
        <span className="sr-only">Filter income and expense by month</span>
        <select
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-xs font-black text-[#10142d] shadow-sm outline-none transition focus:border-[#df4bb4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month === getCurrentMonthKey() ? "This Month" : month === getLastMonthKey() ? "Last Month" : formatMonthLabel(month)}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10142d]" aria-hidden="true">
          <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </label>
    </div>
    <div className="mt-5 flex flex-1 items-end gap-3">
      <div className="flex h-44 w-14 flex-col justify-between text-right text-[11px] font-bold text-slate-500">
        {axisLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="relative flex h-44 flex-1 items-end justify-center gap-14 border-b border-slate-200 bg-[repeating-linear-gradient(to_bottom,#e5e7eb_0,#e5e7eb_1px,transparent_1px,transparent_44px)] px-6">
        <div
          className="w-24 max-w-[38%] rounded-t-md bg-[#ff1f14]"
          style={{ height: expenseHeight }}
          title={`Expenses: ${formatPeso(expenses)}`}
        />
        <div
          className="w-24 max-w-[38%] rounded-t-md bg-[#18a64f]"
          style={{ height: incomeHeight }}
          title={`Income: ${formatPeso(income)}`}
        />
        <span className="absolute -bottom-6 text-xs font-bold text-slate-500">{monthLabel}</span>
      </div>
    </div>
    <div className="mt-9 flex justify-center gap-10 text-xs font-bold text-[#10142d] dark:text-neutral-300">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ff1f14]" />
        Expenses ({formatPeso(expenses)})
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#18a64f]" />
        Income ({formatPeso(income)})
      </span>
    </div>
  </section>
  );
};

const ExpenseCategories = ({
  entries,
  monthOptions,
  selectedMonth,
  onMonthChange,
}) => {
  const expenseCategories = Object.entries(
    entries
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
      color: ["#fb4778", "#7c5cff", "#b65cf6", "#ff8a1f"][index % 4],
    }));
  const total = expenseCategories.reduce((sum, category) => sum + category.value, 0);
  const visibleCategories =
    expenseCategories.length > 0
      ? expenseCategories
      : [{ label: "No expenses", value: 1, color: "#d64ab2" }];
  const chartStops = visibleCategories.reduce(
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

  return (
  <section className="rounded-2xl border border-pink-100 bg-white px-6 py-5 shadow-[0_8px_24px_rgba(190,65,158,0.08)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold text-[#10172a] dark:text-white">Expense Categories</h2>
      <label className="relative">
        <span className="sr-only">Filter expense categories by month</span>
        <select
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-xs font-black text-[#10172a] shadow-sm outline-none transition focus:border-[#df4bb4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
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
    <div className="mt-5 grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
      <div
        className="relative mx-auto grid h-48 w-48 place-items-center rounded-full"
        style={{ background: `conic-gradient(${chartStops.join(", ")})` }}
      >
        <div
          className="grid h-26 w-26 place-items-center rounded-full bg-white text-center shadow-[0_12px_28px_rgba(35,42,72,0.1)] dark:bg-[#141414]"
        >
          <span>
            <span className="block text-[10px] font-semibold text-slate-500 dark:text-neutral-400">Total Expenses</span>
            <span className="mt-1 block text-lg font-extrabold text-[#10172a] dark:text-white">
              {formatPeso(total)}
            </span>
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-3 text-xs text-[#10172a] dark:text-neutral-200">
        {expenseCategories.length === 0 && (
          <span className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d64ab2]" />
            No expenses
          </span>
        )}
        {expenseCategories.map((category) => (
          <span
            key={category.label}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-neutral-800"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate font-semibold">{category.label}</span>
            </span>
            <span className="font-black">{formatPeso(category.value)}</span>
            <span className="w-14 text-right font-black text-slate-500 dark:text-neutral-400">
              {total > 0 ? `${((category.value / total) * 100).toFixed(1)}%` : "0%"}
            </span>
          </span>
        ))}
      </div>
    </div>
  </section>
  );
};

const EntryType = ({ type }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black lowercase ${
      type === "income"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-pink-50 text-pink-600"
    }`}
  >
    <span>{type === "income" ? "+" : "-"}</span>
    {type}
  </span>
);

const formatCurrency = (amount) => formatPeso(amount, { signed: true });

const getTotalsForEntries = (entries) => {
  const income = entries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  return {
    balance: income - expenses,
    expenses,
    income,
  };
};

const getPercentChange = (current, previous) => {
  if (!previous && !current) return "0%";
  if (!previous) return "+100%";
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`;
};

const Budget = ({ onAddEntry, onEditEntry, refreshKey = 0 }) => {
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

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
          setErrorMessage(getApiErrorMessage(error, "Unable to load budget entries."));
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

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(budgetEntries.map((entry) => getMonthKey(entry.inputDate || entry.date)))
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

  const filteredBudgetEntries = useMemo(
    () =>
      budgetEntries.filter(
        (entry) => getMonthKey(entry.inputDate || entry.date) === selectedMonth
      ),
    [budgetEntries, selectedMonth]
  );

  const visibleBudgetEntries = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return [...filteredBudgetEntries]
      .filter((entry) => {
        const matchesSearch =
          !normalizedSearch ||
          entry.description.toLowerCase().includes(normalizedSearch) ||
          entry.category.toLowerCase().includes(normalizedSearch);
        const matchesType =
          typeFilter === "All Types" ||
          entry.type === typeFilter.toLowerCase();

        return matchesSearch && matchesType;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.inputDate);
        const secondDate = new Date(second.inputDate);
        return sortOrder === "Newest" ? secondDate - firstDate : firstDate - secondDate;
      });
  }, [filteredBudgetEntries, searchQuery, sortOrder, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleBudgetEntries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBudgetEntries = visibleBudgetEntries.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth, sortOrder, typeFilter]);

  const totals = useMemo(
    () => getTotalsForEntries(filteredBudgetEntries),
    [filteredBudgetEntries]
  );

  const previousMonthTotals = useMemo(() => {
    const previousMonthKey = getPreviousMonthKey(selectedMonth);
    const previousEntries = budgetEntries.filter(
      (entry) => getMonthKey(entry.inputDate || entry.date) === previousMonthKey
    );

    return getTotalsForEntries(previousEntries);
  }, [budgetEntries, selectedMonth]);

  const summaryNotes = useMemo(
    () => ({
      expense: `${getPercentChange(totals.expenses, previousMonthTotals.expenses)} from last month`,
      income: `${getPercentChange(totals.income, previousMonthTotals.income)} from last month`,
    }),
    [previousMonthTotals, totals]
  );

  const deleteEntry = async (entryId) => {
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
        <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950 dark:text-white"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Budget Planner
              </h1>
              <p className="mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Track your income and expenses
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onAddEntry}
                className="flex h-10 items-center gap-2 rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-5 text-sm font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
            </div>
          </header>

          <section className="mt-5 grid gap-4 md:grid-cols-3">
            {isLoading ? (
              <BudgetSummarySkeleton />
            ) : (
              <>
                <SummaryCard icon="income" label="Total Income" note={summaryNotes.income} noteClass={totals.income >= previousMonthTotals.income ? "text-emerald-600" : "text-pink-600"} value={formatPeso(totals.income)} />
                <SummaryCard icon="expense" label="Total Expense" note={summaryNotes.expense} noteClass={totals.expenses <= previousMonthTotals.expenses ? "text-emerald-600" : "text-pink-600"} value={formatPeso(totals.expenses)} />
                <SummaryCard icon="balance" label="Balance" note="Available to spend" value={formatPeso(totals.balance)} />
              </>
            )}
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <BudgetChartsSkeleton />
            ) : (
              <>
                <IncomeExpenseChart
                  expenses={totals.expenses}
                  income={totals.income}
                  monthLabel={formatMonthLabel(selectedMonth)}
                  monthOptions={monthOptions}
                  onMonthChange={setSelectedMonth}
                  selectedMonth={selectedMonth}
                />
                <ExpenseCategories
                  entries={filteredBudgetEntries}
                  monthOptions={monthOptions}
                  onMonthChange={setSelectedMonth}
                  selectedMonth={selectedMonth}
                />
              </>
            )}
          </section>

          {errorMessage && (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

          <section className="mt-4 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_8px_24px_rgba(190,65,158,0.08)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <h2 className="text-base font-black text-[#10142d] dark:text-white">Recent Transactions</h2>
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative block">
                  <span className="sr-only">Search transactions</span>
                  <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search transactions..."
                    className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                  />
                </label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                >
                  <option>All Types</option>
                  <option>Income</option>
                  <option>Expense</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                >
                  <option>Newest</option>
                  <option>Oldest</option>
                </select>
              </div>
            </div>
            <table className="w-full min-w-[860px] text-left text-xs text-[#10142d] dark:text-neutral-200">
              <thead className="bg-slate-50 text-slate-500 dark:border-neutral-700">
                <tr>
                  <th className="px-5 py-3 font-black">Type</th>
                  <th className="px-5 py-3 font-black">Description</th>
                  <th className="px-5 py-3 font-black">Category</th>
                  <th className="px-5 py-3 font-black">Date</th>
                  <th className="px-5 py-3 font-black">Amount</th>
                  <th className="px-5 py-3 text-right font-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <SkeletonRows rows={6} columns={6} />
                )}

                {!isLoading && visibleBudgetEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center font-medium text-neutral-600 dark:text-neutral-400">
                      No budget entries found for {formatMonthLabel(selectedMonth)}.
                    </td>
                  </tr>
                )}

                {!isLoading && paginatedBudgetEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3">
                      <EntryType type={entry.type} />
                    </td>
                    <td className="px-5 py-3 font-bold">{entry.description}</td>
                    <td className="px-5 py-3 font-bold">{entry.category}</td>
                    <td className="px-5 py-3 font-bold text-slate-600 dark:text-neutral-400">{entry.date}</td>
                    <td
                      className={`px-5 py-3 font-bold ${
                        entry.amount < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => onEditEntry?.(entry)}
                          className="text-neutral-900 transition hover:text-[#c72fb2] dark:text-neutral-300"
                          aria-label={`Edit ${entry.description}`}
                        >
                          <Icon name="edit" className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryToDelete(entry)}
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
            {!isLoading && visibleBudgetEntries.length > pageSize && (
              <div className="flex items-center justify-center gap-5 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#c72fb2] disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                    <path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`grid h-8 min-w-8 place-items-center rounded-lg px-3 text-xs font-black ${
                      safePage === page ? "bg-pink-100 text-[#c72fb2]" : "text-[#10142d]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#c72fb2] disabled:opacity-40"
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                    <path d="m8 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </section>
          <ConfirmDialog
            confirmLabel="Yes , delete"
            icon="delete"
            isOpen={Boolean(entryToDelete)}
            message={`Delete "${entryToDelete?.description || "this entry"}"?`}
            onCancel={() => setEntryToDelete(null)}
            onConfirm={async () => {
              const entry = entryToDelete;
              setEntryToDelete(null);
              if (entry) await deleteEntry(entry.id);
            }}
            title="Delete"
          />
        </div>
  );
};

export default Budget;
