import { useEffect, useState } from "react";
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

const emptyForm = {
  type: "expense",
  description: "",
  category: "",
  amount: "",
  date: formatInputDate(),
};

const FieldLabel = ({ children }) => (
  <label className="text-sm font-medium text-neutral-800">{children}</label>
);

const Addbudget = ({ entry, onBudgetSaved, onNavigate }) => {
  const isEditing = Boolean(entry?.id);
  const [formData, setFormData] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!entry) {
      setFormData(emptyForm);
      return;
    }

    setFormData({
      type: entry.type || "expense",
      description: entry.description || "",
      category: entry.category || "",
      amount: String(Math.abs(Number(entry.amount) || 0)),
      date: entry.inputDate || formatInputDate(entry.date),
    });
  }, [entry]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    onNavigate?.("budget");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(formData.amount);

    if (!formData.description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }

    if (!formData.category.trim()) {
      setErrorMessage("Category is required.");
      return;
    }

    if (!formData.date || Number.isNaN(new Date(formData.date).getTime())) {
      setErrorMessage("Valid date is required.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        type: formData.type,
        description: formData.description.trim(),
        category: formData.category.trim(),
        amount: Math.abs(amount),
        date: formData.date,
      };

      if (isEditing) {
        await budgetAPI.update(entry.id, payload);
      } else {
        await budgetAPI.create(payload);
      }

      onBudgetSaved?.();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          `Unable to ${isEditing ? "update" : "create"} budget entry.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 text-neutral-950">
      <section className="max-h-full w-full max-w-[690px] overflow-y-auto bg-[#f1f1f1] shadow-2xl">
        <header className="border-b border-neutral-300 px-8 py-11 sm:px-11">
          <h1
            className="text-2xl uppercase leading-none text-neutral-950 sm:text-3xl"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            {isEditing ? "Edit Entry" : "New Entry"}
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col px-8 py-10 sm:px-11 sm:py-12"
        >
          {errorMessage && (
            <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Type</FieldLabel>
              <select
                value={formData.type}
                onChange={(event) => updateField("type", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="space-y-1">
              <FieldLabel>Date</FieldLabel>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => updateField("date", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <FieldLabel>Description</FieldLabel>
            <input
              type="text"
              value={formData.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Entry description..."
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Category</FieldLabel>
              <input
                type="text"
                value={formData.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="General..."
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Amount ($)</FieldLabel>
              <input
                type="text"
                inputMode="decimal"
                value={formData.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 rounded-lg border border-[#9a55ff] bg-transparent text-xs font-semibold text-neutral-700 transition hover:bg-purple-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-[#dc4fb2] text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Entry"
                  : "Add Entry"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Addbudget;
