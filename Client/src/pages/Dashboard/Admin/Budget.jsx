import { useEffect, useMemo, useState } from "react";
import { budgetAPI } from "../../../services/api.js";
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

const SummaryCard = ({ icon, label, value }) => (
  <section className="flex h-24 items-center justify-center gap-8 rounded-lg border-b-2 border-[#e347b3] bg-white px-6 shadow-[0_3px_4px_rgba(219,39,119,0.22)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
    <Icon name={icon} className="h-16 w-16" />
    <div className="min-w-[110px] text-center leading-tight">
      <p className="text-3xl font-bold text-neutral-950 dark:text-white">{value}</p>
      <p className="text-base text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  </section>
);

const ExpenseBreakdown = ({ expenses, income }) => {
  const maxValue = Math.max(income, expenses, 1);
  const expenseHeight = `${Math.max((expenses / maxValue) * 100, 8)}%`;
  const incomeHeight = `${Math.max((income / maxValue) * 100, 8)}%`;
  const axisLabels = [1, 0.75, 0.5, 0.25, 0].map((multiplier) =>
    formatPeso(Math.round(maxValue * multiplier))
  );

  return (
  <section className="flex min-h-[315px] flex-col rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Expense Breakdown</h2>
    <div className="mt-6 flex flex-1 items-end gap-4">
      <div className="flex h-52 w-12 flex-col justify-between text-right text-xs text-neutral-500 dark:text-neutral-500">
        {axisLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="relative flex h-52 flex-1 items-end justify-center gap-8 border-b border-neutral-300 bg-[repeating-linear-gradient(to_bottom,#d9d9d9_0,#d9d9d9_1px,transparent_1px,transparent_52px)] px-8 dark:border-neutral-700 dark:bg-[repeating-linear-gradient(to_bottom,#474747_0,#474747_1px,transparent_1px,transparent_52px)]">
        <div
          className="w-24 max-w-[34%] rounded-t-sm bg-[#ff1f14]"
          style={{ height: expenseHeight }}
          title={`Expenses: ${formatPeso(expenses)}`}
        />
        <div
          className="w-24 max-w-[34%] rounded-t-sm bg-[#18a64f]"
          style={{ height: incomeHeight }}
          title={`Income: ${formatPeso(income)}`}
        />
        <span className="absolute -bottom-5 text-xs text-neutral-400">Dec 25</span>
      </div>
    </div>
    <div className="mt-9 flex justify-center gap-16 text-xs text-neutral-700 dark:text-neutral-300">
      <span className="flex items-center gap-2">
        <Icon name="expense" className="h-5 w-5" />
        Expenses
      </span>
      <span className="flex items-center gap-2">
        <Icon name="income" className="h-5 w-5" />
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
  <section className="rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Expense Categories</h2>
    <div className="mt-4 flex flex-col items-center">
      <div
        className="relative h-44 w-44 shrink-0 rounded-full sm:h-52 sm:w-52"
        style={{ background: chartBackground }}
      />
      <div className="mt-5 grid w-full grid-cols-2 gap-x-5 gap-y-2 text-xs text-neutral-600 dark:text-neutral-300 sm:grid-cols-4">
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
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold lowercase ${
      type === "income"
        ? "bg-[#72e89d] text-[#1fb85b]"
        : "bg-[#ec7a7d] text-[#e11f2a]"
    }`}
  >
    <Icon name="down" className="h-3 w-3" />
    {type}
  </span>
);

const formatCurrency = (amount) => formatPeso(amount, { signed: true });

const Budget = ({ onAddEntry, onEditEntry, refreshKey = 0 }) => {
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState(null);

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
        <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f1f1f1] px-4 py-5 dark:bg-neutral-950 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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
                className="flex h-11 items-center gap-3 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-5 text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
            </div>
          </header>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {isLoading ? (
              <BudgetSummarySkeleton />
            ) : (
              <>
                <SummaryCard icon="income" label="Total Income" value={formatPeso(totals.income)} />
                <SummaryCard icon="expense" label="Total Expense" value={formatPeso(totals.expenses)} />
                <SummaryCard icon="balance" label="Balance" value={formatPeso(totals.balance)} />
              </>
            )}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <BudgetChartsSkeleton />
            ) : (
              <>
                <ExpenseBreakdown expenses={totals.expenses} income={totals.income} />
                <ExpenseCategories entries={budgetEntries} />
              </>
            )}
          </section>

          {errorMessage && (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

          <section className="mt-4 overflow-hidden rounded-lg bg-white shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
            <table className="w-full min-w-[780px] text-left text-xs text-neutral-800 dark:text-neutral-200">
              <thead className="border-b border-neutral-300 dark:border-neutral-700">
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
                  <SkeletonRows rows={6} columns={6} />
                )}

                {!isLoading && budgetEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center font-medium text-neutral-600 dark:text-neutral-400">
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
                    <td className="px-5 py-4 text-neutral-500 dark:text-neutral-400">{entry.date}</td>
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
