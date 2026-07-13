import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import Skeleton from "../../../components/Skeleton.jsx";
import { budgetPlannerAPI, getApiErrorMessage } from "../../../services/api.js";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
const emptyEntry = () => ({
  type: "expense",
  description: "",
  category: "",
  date: today(),
  amount: "",
});

const monthLabel = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const paths = {
    plus: "M12 5v14M5 12h14",
    edit: "m14.7 5.3 4 4M4 20l4.4-1 10.2-10.2a2.8 2.8 0 0 0-4-4L4.4 15 4 20z",
    trash: "M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6",
    close: "m6 6 12 12M18 6 6 18",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const SummaryCard = ({ label, value, tone, helper }) => {
  const tones = {
    pink: "from-[#df4bb4] to-[#c72fb2]",
    green: "from-emerald-500 to-emerald-600",
    violet: "from-violet-500 to-violet-600",
  };
  return (
    <article className={`rounded-2xl bg-linear-to-br ${tones[tone]} p-5 text-white shadow-lg`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/75">{label}</p>
      <p className="mt-3 truncate text-2xl font-black">{peso.format(value)}</p>
      <p className="mt-1 text-xs font-semibold text-white/75">{helper}</p>
    </article>
  );
};

const EntryModal = ({ entry, onClose, onSaved }) => {
  const [form, setForm] = useState(entry ? {
    type: entry.type,
    description: entry.description,
    category: entry.category,
    date: String(entry.date).slice(0, 10),
    amount: String(entry.amount),
  } : emptyEntry());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !form.category.trim() || !form.date) {
      setError("Complete all fields before saving.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = { ...form, amount, description: form.description.trim(), category: form.category.trim() };
      if (entry?._id) await budgetPlannerAPI.update(entry._id, payload);
      else await budgetPlannerAPI.create(payload);
      onSaved();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save this entry."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c72fb2]">Budget planner</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{entry ? "Edit entry" : "Add an entry"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Type
            <select value={form.type} onChange={(event) => change("type", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#dc4fb2] dark:border-neutral-700 dark:bg-neutral-950">
              <option value="expense">Expense</option><option value="income">Income</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Date
            <input type="date" value={form.date} onChange={(event) => change("date", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#dc4fb2] dark:border-neutral-700 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Description
            <input value={form.description} maxLength={120} onChange={(event) => change("description", event.target.value)} placeholder="e.g. Grocery shopping" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-[#dc4fb2]" />
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Category
            <input value={form.category} maxLength={60} onChange={(event) => change("category", event.target.value)} placeholder="e.g. Food" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-[#dc4fb2]" />
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (PHP)
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => change("amount", event.target.value)} placeholder="0.00" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-[#dc4fb2]" />
          </label>
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-600 dark:border-neutral-700 dark:text-slate-300">Cancel</button>
          <button disabled={saving} className="h-11 rounded-xl bg-[#dc4fb2] px-6 text-sm font-black text-white shadow-md disabled:opacity-60">{saving ? "Saving..." : "Save entry"}</button>
        </div>
      </form>
    </div>
  );
};

const EmpBudgetPlanner = () => {
  const [entries, setEntries] = useState([]);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [limitDraft, setLimitDraft] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [modalEntry, setModalEntry] = useState(undefined);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await budgetPlannerAPI.get();
      setEntries(Array.isArray(result.entries) ? result.entries : []);
      setMonthlyLimit(Number(result.monthlyLimit) || 0);
      setLimitDraft(String(Number(result.monthlyLimit) || ""));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load your budget planner."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const monthEntries = useMemo(() => entries.filter((entry) => String(entry.date).slice(0, 7) === selectedMonth), [entries, selectedMonth]);
  const income = monthEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = monthEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const remaining = monthlyLimit > 0 ? monthlyLimit - expenses : income - expenses;
  const usedPercent = monthlyLimit > 0 ? Math.min((expenses / monthlyLimit) * 100, 100) : 0;
  const categories = useMemo(() => {
    const totals = new Map();
    monthEntries.filter((entry) => entry.type === "expense").forEach((entry) => totals.set(entry.category, (totals.get(entry.category) || 0) + Number(entry.amount)));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthEntries]);

  const saveLimit = async () => {
    const nextLimit = Number(limitDraft);
    if (!Number.isFinite(nextLimit) || nextLimit < 0) return setError("Monthly budget must be zero or greater.");
    try {
      setSavingLimit(true); setError("");
      const result = await budgetPlannerAPI.updateSettings(nextLimit);
      setMonthlyLimit(Number(result.monthlyLimit) || 0);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save your monthly budget."));
    } finally { setSavingLimit(false); }
  };

  const confirmDelete = async () => {
    const entry = deleteEntry; setDeleteEntry(null);
    if (!entry) return;
    try { await budgetPlannerAPI.delete(entry._id); await load(); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to delete this entry.")); }
  };

  return (
    <div className="-mx-4 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f6f7fb] px-4 py-6 text-slate-950 dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#c72fb2]">Personal finance</p><h1 className="mt-2 text-3xl font-black">Budget Planner</h1><p className="mt-2 text-sm font-medium text-slate-500">Plan your month and keep personal spending on track.</p></div>
          <div className="flex gap-3">
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-neutral-700 dark:bg-neutral-900" aria-label="Budget month" />
            <button onClick={() => setModalEntry(null)} className="flex h-11 items-center gap-2 rounded-xl bg-[#dc4fb2] px-4 text-sm font-black text-white shadow-lg"><Icon name="plus" /> Add entry</button>
          </div>
        </header>

        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Income" value={income} tone="green" helper={monthLabel(selectedMonth)} />
          <SummaryCard label="Expenses" value={expenses} tone="pink" helper={`${monthEntries.filter((entry) => entry.type === "expense").length} expense entries`} />
          <SummaryCard label={monthlyLimit ? "Budget remaining" : "Cash balance"} value={remaining} tone="violet" helper={remaining < 0 ? "You are over budget" : "Available this month"} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-neutral-900 dark:ring-neutral-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-black">Monthly spending limit</h2><p className="mt-1 text-sm font-medium text-slate-500">Set the amount you want to stay within each month.</p></div><div className="flex gap-2"><input type="number" min="0" step="0.01" value={limitDraft} onChange={(event) => setLimitDraft(event.target.value)} placeholder="0.00" className="h-10 w-36 rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold outline-none focus:border-[#dc4fb2]" /><button onClick={saveLimit} disabled={savingLimit} className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950">{savingLimit ? "Saving" : "Save"}</button></div></div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800"><div className={`h-full rounded-full transition-all ${usedPercent >= 100 ? "bg-red-500" : usedPercent >= 80 ? "bg-amber-500" : "bg-[#dc4fb2]"}`} style={{ width: `${usedPercent}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>{monthlyLimit ? `${usedPercent.toFixed(0)}% used` : "Set a limit to track progress"}</span><span>{peso.format(expenses)} of {peso.format(monthlyLimit)}</span></div>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-neutral-900 dark:ring-neutral-800"><h2 className="text-lg font-black">Top categories</h2><div className="mt-4 space-y-3">{categories.length ? categories.slice(0, 4).map(([category, total]) => <div key={category}><div className="flex justify-between text-sm font-bold"><span className="truncate">{category}</span><span>{peso.format(total)}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-[#dc4fb2]" style={{ width: `${expenses ? (total / expenses) * 100 : 0}%` }} /></div></div>) : <p className="py-6 text-center text-sm font-semibold text-slate-400">No expenses this month.</p>}</div></article>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-neutral-900 dark:ring-neutral-800">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-neutral-800"><h2 className="text-lg font-black">{monthLabel(selectedMonth)} entries</h2></div>
          {loading ? <div className="space-y-4 p-5">{[1,2,3].map((row) => <Skeleton key={row} className="h-12 w-full rounded-xl" />)}</div> : !monthEntries.length ? <div className="px-5 py-14 text-center"><p className="font-black text-slate-700 dark:text-slate-200">Nothing recorded yet</p><p className="mt-1 text-sm font-medium text-slate-400">Add income or an expense to start planning this month.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-neutral-950"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-neutral-800">{monthEntries.map((entry) => <tr key={entry._id} className="text-sm"><td className="px-5 py-4 font-semibold text-slate-500">{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td><td className="px-5 py-4 font-black">{entry.description}</td><td className="px-5 py-4"><span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-[#c72fb2] dark:bg-pink-950/30">{entry.category}</span></td><td className={`px-5 py-4 text-right font-black ${entry.type === "income" ? "text-emerald-600" : "text-red-500"}`}>{entry.type === "income" ? "+" : "-"}{peso.format(entry.amount)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => setModalEntry(entry)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800" aria-label={`Edit ${entry.description}`}><Icon name="edit" /></button><button onClick={() => setDeleteEntry(entry)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Delete ${entry.description}`}><Icon name="trash" /></button></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>

      {modalEntry !== undefined && <EntryModal entry={modalEntry} onClose={() => setModalEntry(undefined)} onSaved={async () => { setModalEntry(undefined); await load(); }} />}
      <ConfirmDialog isOpen={Boolean(deleteEntry)} title="Delete entry" message={`Delete “${deleteEntry?.description || "this entry"}”?`} confirmLabel="Delete" icon="delete" onCancel={() => setDeleteEntry(null)} onConfirm={confirmDelete} />
    </div>
  );
};

export default EmpBudgetPlanner;
