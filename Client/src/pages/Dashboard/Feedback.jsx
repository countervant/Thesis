import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Mail,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Smile,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { getApiErrorMessage, taskAPI } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import InitialsAvatar from "../../components/InitialsAvatar.jsx";

const notificationTargetKey = "clientraNotificationTarget";
const ratingColors = ["#7c3aed", "#a855f7", "#ec4899", "#fb923c", "#94a3b8"];
const pageSize = 6;
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white font-black text-slate-600 transition hover:border-pink-200 hover:bg-pink-50 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300";

const getPersonName = (person, fallback = "CLIENTRA Client") => {
  const fullName = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return fullName || person?.contactPerson || person?.name || person?.companyName || person?.email || fallback;
};

const isPersonRecord = (value) => Boolean(value && typeof value === "object");

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Date unavailable";
};

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

const getMonthDifference = (items, dateSelector) => {
  const now = new Date();
  const currentKey = monthKey(now);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previous);
  const currentCount = items.filter((item) => {
    const date = toDate(dateSelector(item));
    return date && monthKey(date) === currentKey;
  }).length;
  const previousCount = items.filter((item) => {
    const date = toDate(dateSelector(item));
    return date && monthKey(date) === previousKey;
  }).length;
  return currentCount - previousCount;
};

const Trend = ({ value }) => (
  <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold ${value < 0 ? "text-rose-500" : "text-emerald-500"}`}>
    {value < 0 ? "↓" : "↑"} {Math.abs(value)} vs last month
  </span>
);

const MetricCard = ({ icon, iconClass, label, trend, value }) => (
  <article className="rounded-xl border border-pink-100 bg-white p-3 shadow-[0_8px_28px_rgba(148,46,123,0.07)] dark:border-neutral-800 dark:bg-neutral-900 md:rounded-2xl md:p-4">
    <div className="flex items-center gap-2 md:gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl md:h-11 md:w-11 md:rounded-2xl ${iconClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-black text-[#10142d] dark:text-white md:mt-1 md:text-2xl">{value}</p>
        <span className="hidden md:block"><Trend value={trend} /></span>
      </div>
    </div>
  </article>
);

const Stars = ({ rating }) => (
  <span className="inline-flex items-center gap-1.5" aria-label={`${rating} out of 5 stars`}>
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"}`}
        />
      ))}
    </span>
    <span className="text-xs font-black text-amber-600">{rating}/5</span>
  </span>
);

const SatisfactionChart = ({ average, distribution, total }) => {
  let cursor = 0;
  const segments = distribution.map((count, index) => {
    const start = cursor;
    cursor += total ? (count / total) * 100 : 0;
    return `${ratingColors[index]} ${start}% ${cursor}%`;
  });
  const background = total ? `conic-gradient(${segments.join(", ")})` : "#f1f5f9";

  return (
    <article className="min-w-0 rounded-xl border border-pink-100 bg-white p-3 shadow-[0_8px_28px_rgba(148,46,123,0.07)] dark:border-neutral-800 dark:bg-neutral-900 md:rounded-2xl md:p-5">
      <h2 className="truncate text-xs font-black text-[#10142d] dark:text-white md:text-sm">Client Satisfaction</h2>
      <div className="mt-3 flex items-center justify-center gap-6 md:mt-5 md:justify-start xl:justify-center">
        <div className="relative h-20 w-20 shrink-0 rounded-full md:h-36 md:w-36" style={{ background }}>
          <div className="absolute inset-3 grid place-items-center rounded-full bg-white text-center dark:bg-neutral-900 md:inset-[22px]">
            <div>
              <p className="text-lg font-black text-[#10142d] dark:text-white md:text-2xl">{average}</p>
              <p className="text-[8px] font-bold leading-tight text-slate-500 md:text-[10px]">Average<br className="md:hidden" /> Rating</p>
            </div>
          </div>
        </div>
        <div className="hidden space-y-2.5 md:block">
          {distribution.map((count, index) => {
            const stars = 5 - index;
            const percent = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ratingColors[index] }} />
                <span className="w-12">{stars} Stars</span>
                <span className="w-8 text-right text-[#10142d] dark:text-white">{percent}%</span>
                <span className="text-slate-400">({count})</span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
};

const TrendChart = ({ feedback }) => {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: monthKey(date),
        label: date.toLocaleDateString("en-US", { month: "short" }),
      };
    });
  }, []);
  const values = months.map((month) =>
    feedback.filter((item) => {
      const date = toDate(item.submittedAt);
      return date && monthKey(date) === month.key;
    }).length
  );
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 20 + index * 64;
    const y = 132 - (value / max) * 100;
    return { x, y };
  });
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `20,142 ${polyline} ${points.at(-1)?.x || 340},142`;

  return (
    <article className="min-w-0 rounded-xl border border-pink-100 bg-white p-3 shadow-[0_8px_28px_rgba(148,46,123,0.07)] dark:border-neutral-800 dark:bg-neutral-900 md:rounded-2xl md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-xs font-black text-[#10142d] dark:text-white md:text-sm">Feedback Trend</h2>
        <span className="hidden rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-neutral-800 md:inline-flex">Last 6 Months</span>
      </div>
      <svg viewBox="0 0 360 170" className="mt-2 h-24 w-full md:mt-4 md:h-44" role="img" aria-label="Feedback received during the last six months">
        <defs>
          <linearGradient id="feedbackArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[42, 82, 122].map((y) => <line key={y} x1="20" x2="340" y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />)}
        <polygon points={area} fill="url(#feedbackArea)" />
        <polyline points={polyline} fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={months[index].key}>
            <circle cx={point.x} cy={point.y} r="4" fill="#ec4899" stroke="white" strokeWidth="2" />
            <text x={point.x} y="160" textAnchor="middle" className="fill-slate-400 text-[10px] font-bold">{months[index].label}</text>
          </g>
        ))}
      </svg>
    </article>
  );
};

const FeedbackDetails = ({ item, onClose }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Client Feedback</p>
            <h2 className="mt-1 text-xl font-black text-[#10142d] dark:text-white">{item.project}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-pink-50" aria-label="Close feedback details"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-neutral-800">
          <InitialsAvatar user={item.client} name={item.clientName} alt={item.clientName} className="h-11 w-11" />
          <div><p className="font-black text-[#10142d] dark:text-white">{item.clientName}</p><p className="text-xs font-bold text-slate-500">{formatDate(item.submittedAt)}</p></div>
          <span className="min-[390px]:ml-auto"><Stars rating={item.rating} /></span>
        </div>
        <p className="mt-5 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">“{item.comment || "The client submitted a rating without an additional comment."}”</p>
        {item.reply?.message && (
          <div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-xs font-black uppercase tracking-wide text-pink-600">Admin Reply</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{item.reply.message}</p>
            <p className="mt-2 text-[11px] font-bold text-slate-400">{getPersonName(item.reply.repliedBy)} · {formatDate(item.reply.repliedAt)}</p>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold md:grid-cols-4">
          {[['Quality', item.quality], ['Communication', item.communication], ['Timeliness', item.timeliness], ['Satisfaction', item.satisfaction]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-pink-100 p-3 text-center dark:border-neutral-700"><p className="text-slate-400">{label}</p><p className="mt-1 text-base font-black text-[#10142d] dark:text-white">{value || '—'}/5</p></div>
          ))}
        </div>
      </article>
    </div>
  );
};

const ReplyModal = ({ item, onClose, onSent }) => {
  const [message, setMessage] = useState(item?.reply?.message || "");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const reply = message.trim();
    if (!reply) {
      setErrorMessage("Please enter a reply.");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      const wasEditing = Boolean(item.reply?.message);
      const updatedTask = await taskAPI.replyToFeedback(item.id, reply);
      setMessage("");
      onSent(updatedTask, wasEditing);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to send your reply."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && !isSending && onClose()}>
      <form onSubmit={handleSubmit} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Reply to Client</p><h2 className="mt-1 text-xl font-black text-[#10142d] dark:text-white">{item.clientName}</h2><p className="mt-1 text-xs font-bold text-slate-500">Feedback for {item.project}</p></div>
          <button type="button" disabled={isSending} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-pink-50 disabled:opacity-50" aria-label="Close reply form"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-neutral-800"><Stars rating={item.rating} /><p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">“{item.comment || "Rating submitted without a comment."}”</p></div>
        <label className="mt-5 block"><span className="text-xs font-black text-slate-600 dark:text-slate-300">Your reply</span><textarea autoFocus maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a helpful response to the client..." className="mt-2 h-36 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-neutral-950" /><span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{message.length}/1000</span></label>
        {errorMessage && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{errorMessage}</p>}
        <div className="mt-5 grid gap-3 min-[380px]:flex min-[380px]:justify-end">
          <button type="button" disabled={isSending} onClick={onClose} className={`${secondaryButtonClass} h-10 w-full px-5 text-xs min-[380px]:w-auto`}>Cancel</button>
          <button type="submit" disabled={isSending || !message.trim()} className={`${primaryButtonClass} h-10 w-full px-5 text-xs min-[380px]:w-auto`}>
            <Mail className="h-4 w-4" />
            {isSending ? "Sending..." : item.reply?.message ? "Update Reply" : "Send Reply"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Feedback = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const noticeTimerRef = useRef(null);

  useEffect(() => () => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
  }, []);

  const showNotice = (message) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNoticeMessage(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeMessage("");
      noticeTimerRef.current = null;
    }, 4500);
  };

  useEffect(() => {
    let mounted = true;
    const loadFeedback = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll({ limit: 100 });
        if (mounted) setTasks(data);
      } catch (error) {
        if (mounted) setErrorMessage(getApiErrorMessage(error, "Unable to load client feedback."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadFeedback();
    return () => { mounted = false; };
  }, []);

  const feedback = useMemo(() => tasks.flatMap((task) => {
    const entry = task?.feedback;
    const rating = Number(entry?.overallRating || entry?.rating);
    if (!entry?.submittedAt || !Number.isFinite(rating) || rating < 1 || rating > 5) return [];
    const client = [entry.submittedBy, entry.user, task.requestedBy, task.createdBy].find(isPersonRecord) || null;
    const clientName = getPersonName(client, task.requestedByName || "CLIENTRA Client");
    return [{
      id: task._id || task.id,
      project: task.title || "Untitled Project",
      client,
      clientName,
      clientEmail: client?.email || "",
      rating,
      comment: entry.comment || "",
      quality: entry.quality || entry.qualityRating,
      communication: entry.communication || entry.communicationRating,
      timeliness: entry.timeliness || entry.timelinessRating,
      satisfaction: entry.overallSatisfaction,
      submittedAt: entry.submittedAt,
      reply: entry.reply || null,
    }];
  }), [tasks]);

  useEffect(() => {
    const openNotificationTarget = () => {
      const rawTarget = sessionStorage.getItem(notificationTargetKey);
      if (!rawTarget || isLoading) return;

      try {
        const target = JSON.parse(rawTarget);
        if (target?.page !== "feedback" || !target?.taskId) return;

        const targetFeedback = feedback.find((item) => String(item.id) === String(target.taskId));
        if (!targetFeedback) return;

        setSelectedFeedback(targetFeedback);
        sessionStorage.removeItem(notificationTargetKey);
      } catch {
        sessionStorage.removeItem(notificationTargetKey);
      }
    };

    openNotificationTarget();
    window.addEventListener("clientra:notification-target", openNotificationTarget);
    return () => window.removeEventListener("clientra:notification-target", openNotificationTarget);
  }, [feedback, isLoading]);

  const pendingReviews = tasks.filter((task) => task.status === "done" && !task.feedback?.submittedAt);
  const average = feedback.length ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "0.0";
  const satisfiedPercent = feedback.length ? Math.round((feedback.filter((item) => item.rating >= 4).length / feedback.length) * 100) : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => feedback.filter((item) => item.rating === rating).length);
  const feedbackTrend = getMonthDifference(feedback, (item) => item.submittedAt);
  const pendingTrend = getMonthDifference(pendingReviews, (item) => item.updatedAt || item.dueDate);
  const projects = [...new Set(feedback.map((item) => item.project))].sort();

  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();
    return feedback
      .filter((item) =>
        (!query || item.clientName.toLowerCase().includes(query) || item.project.toLowerCase().includes(query) || item.comment.toLowerCase().includes(query)) &&
        (ratingFilter === "all" || item.rating === Number(ratingFilter)) &&
        (projectFilter === "all" || item.project === projectFilter)
      )
      .sort((a, b) => {
        if (sortBy === "highest") return b.rating - a.rating;
        if (sortBy === "lowest") return a.rating - b.rating;
        const first = toDate(a.submittedAt)?.getTime() || 0;
        const second = toDate(b.submittedAt)?.getTime() || 0;
        return sortBy === "oldest" ? first - second : second - first;
      });
  }, [feedback, projectFilter, ratingFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredFeedback.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleFeedback = filteredFeedback.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setSearch("");
    setRatingFilter("all");
    setProjectFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  const handleReplySent = (updatedTask, wasEditing) => {
    const updatedId = updatedTask?._id || updatedTask?.id;
    setTasks((currentTasks) => currentTasks.map((task) => (task?._id || task?.id) === updatedId ? updatedTask : task));
    setReplyTarget(null);
    showNotice(wasEditing ? "Reply updated successfully." : "Reply sent. The client can now view it in their project and notifications.");
  };

  const handleDeleteFeedback = async () => {
    if (!deleteTarget || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError("");
      const updatedTask = await taskAPI.deleteFeedback(deleteTarget.id);
      const updatedId = updatedTask?._id || updatedTask?.id;
      setTasks((currentTasks) => currentTasks.map((task) => (task?._id || task?.id) === updatedId ? updatedTask : task));
      setSelectedFeedback((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      showNotice("Feedback deleted successfully.");
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "Unable to delete feedback."));
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <header>
        <h1 className="page-title text-2xl text-[#10142d] dark:text-white md:text-3xl">Client Feedback</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Monitor client satisfaction, reviews, and project experiences.</p>
      </header>

      {errorMessage && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{errorMessage}</p>}
      {noticeMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{noticeMessage}</p>}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <MetricCard icon={<Star className="h-5 w-5" strokeWidth={2.4} />} iconClass="bg-violet-50 text-violet-500" label="Average Rating" value={average} trend={feedbackTrend} />
        <MetricCard icon={<Smile className="h-5 w-5" strokeWidth={2.4} />} iconClass="bg-emerald-50 text-emerald-500" label="Satisfied Clients" value={`${satisfiedPercent}%`} trend={feedbackTrend} />
        <MetricCard icon={<MessageCircle className="h-5 w-5" strokeWidth={2.4} />} iconClass="bg-orange-50 text-orange-500" label="Total Feedback" value={feedback.length} trend={feedbackTrend} />
        <MetricCard icon={<Clock3 className="h-5 w-5" strokeWidth={2.4} />} iconClass="bg-pink-50 text-pink-500" label="Pending Reviews" value={pendingReviews.length} trend={pendingTrend} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="order-2 min-w-0 space-y-4 xl:order-1">
          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_8px_28px_rgba(148,46,123,0.07)] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex gap-1.5 overflow-x-auto pb-1 min-[520px]:grid min-[520px]:grid-cols-[minmax(130px,1.4fr)_minmax(82px,.75fr)_minmax(88px,.8fr)_minmax(92px,.85fr)_minmax(92px,.8fr)] min-[520px]:overflow-visible">
              <label className="relative min-w-[180px] flex-1 min-[520px]:min-w-0">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search feedback..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-bold outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-neutral-950" />
              </label>
              <select value={ratingFilter} onChange={(event) => { setRatingFilter(event.target.value); setPage(1); }} className="h-10 min-w-[110px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-300 min-[520px]:min-w-0">
                <option value="all">All Ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}
              </select>
              <select value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(1); }} className="h-10 min-w-[115px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-300 min-[520px]:min-w-0">
                <option value="all">All Projects</option>{projects.map((project) => <option key={project} value={project}>{project}</option>)}
              </select>
              <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="h-10 min-w-[115px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-300 min-[520px]:min-w-0">
                <option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="highest">Highest Rated</option><option value="lowest">Lowest Rated</option>
              </select>
              <button type="button" onClick={resetFilters} className={`${secondaryButtonClass} h-10 min-w-[110px] shrink-0 px-2 text-[11px] min-[520px]:min-w-0`}><SlidersHorizontal className="h-4 w-4" />Reset</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-pink-100 bg-white p-2 shadow-[0_8px_28px_rgba(148,46,123,0.07)] dark:border-neutral-800 dark:bg-neutral-900 md:gap-3 md:p-3">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-2 md:gap-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800 md:h-24" />)}</div>
            ) : visibleFeedback.length === 0 ? (
              <div className="grid min-h-72 place-items-center px-5 text-center"><div><MessageCircle className="mx-auto h-10 w-10 text-pink-300" /><h2 className="mt-3 font-black text-[#10142d] dark:text-white">No feedback found</h2><p className="mt-1 text-sm font-semibold text-slate-500">Submitted client feedback will appear here.</p></div></div>
            ) : visibleFeedback.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-pink-100 p-3 dark:border-neutral-800 md:grid md:grid-cols-[minmax(220px,1.2fr)_minmax(170px,.8fr)_auto] md:items-center md:gap-4 md:p-4">
                <div className="flex min-w-0 gap-3">
                  <InitialsAvatar user={item.client} name={item.clientName} alt={item.clientName} className="h-9 w-9 md:h-11 md:w-11" />
                  <div className="min-w-0"><p className="truncate text-sm font-black text-[#10142d] dark:text-white">{item.clientName}</p><Stars rating={item.rating} /><p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">“{item.comment || "Rating submitted without a comment."}”</p></div>
                </div>
                <div className="min-w-0 border-t border-pink-50 pt-3 text-xs dark:border-neutral-800 md:border-t-0 md:pt-0"><p className="font-bold text-slate-400">Project</p><p className="mt-1 truncate font-black text-[#10142d] dark:text-white">{item.project}</p><div className="mt-2 flex flex-wrap items-center gap-2"><p className="inline-flex items-center gap-1.5 font-bold text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.submittedAt)}</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-600">Published</span></div></div>
                <div className="mt-auto flex flex-nowrap items-center gap-1.5 md:mt-0 md:justify-end">
                  {user?.role === "admin" && <button type="button" onClick={() => setReplyTarget(item)} className={`${primaryButtonClass} h-9 min-w-0 flex-1 px-2 text-xs`}><Mail className="h-3.5 w-3.5" /><span className="hidden min-[520px]:inline">{item.reply?.message ? "Edit" : "Reply"}</span></button>}
                  <button type="button" onClick={() => setSelectedFeedback(item)} className={`${primaryButtonClass} h-9 min-w-0 flex-1 px-2 text-xs`}><Eye className="h-3.5 w-3.5" /><span className="hidden min-[520px]:inline">View</span></button>
                  {user?.role === "admin" && <button type="button" onClick={() => { setDeleteError(""); setDeleteTarget(item); }} className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50" aria-label={`Delete feedback from ${item.clientName}`}><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </article>
            ))}
          </div>

          {!isLoading && filteredFeedback.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-bold text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredFeedback.length)} of {filteredFeedback.length}</p>
              <div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Previous feedback page"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-black text-[#10142d] dark:text-white">{currentPage} / {totalPages}</span><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Next feedback page"><ChevronRight className="h-4 w-4" /></button></div>
            </div>
          )}
        </section>

        <aside className="order-1 grid grid-cols-2 gap-2 xl:order-2 xl:block xl:space-y-5">
          <SatisfactionChart average={average} distribution={distribution} total={feedback.length} />
          <TrendChart feedback={feedback} />
        </aside>
      </div>
      <FeedbackDetails item={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      {replyTarget && <ReplyModal key={`${replyTarget.id}-${replyTarget.reply?.repliedAt || ""}`} item={replyTarget} onClose={() => setReplyTarget(null)} onSent={handleReplySent} />}
      <ConfirmDialog
        confirmLabel="Yes, delete"
        confirmingLabel="Deleting..."
        errorMessage={deleteError}
        icon="delete"
        isConfirming={isDeleting}
        isOpen={Boolean(deleteTarget)}
        message="Are you sure you want to delete this feedback?"
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteFeedback}
        title="Delete Feedback"
      />
    </div>
  );
};

export default Feedback;
