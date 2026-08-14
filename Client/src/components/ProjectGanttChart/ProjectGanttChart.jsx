const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseCalendarDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const dateValue = String(value).trim();
  const isoMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const displayMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let parsedDate;

  if (isoMatch) {
    parsedDate = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else if (displayMatch) {
    parsedDate = new Date(Number(displayMatch[3]), Number(displayMatch[1]) - 1, Number(displayMatch[2]));
  } else {
    const fallbackDate = new Date(dateValue);
    if (Number.isNaN(fallbackDate.getTime())) return null;
    parsedDate = new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate());
  }

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const addDays = (date, numberOfDays) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + numberOfDays);
  return nextDate;
};

const formatDate = (date, includeYear = false) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });

const getPhaseState = (subtasks, index, projectStatus) => {
  if (subtasks[index].completed || projectStatus === "Done") return "completed";
  if (subtasks.slice(0, index).every((subtask) => subtask.completed)) return "active";
  return "upcoming";
};

const phaseStyles = {
  completed: "bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.24)]",
  active: "bg-[#d946b8] text-white shadow-[0_4px_10px_rgba(217,70,184,0.24)]",
  upcoming: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

const phaseLabels = {
  completed: "Completed",
  active: "In progress",
  upcoming: "Upcoming",
};

const ProjectGanttChart = ({ item }) => {
  const subtasks = Array.isArray(item?.subtasks) ? item.subtasks : [];
  const parsedStartDate = parseCalendarDate(item?.startDate);
  const parsedDueDate = parseCalendarDate(item?.dueDate);
  const startDate = parsedStartDate || parsedDueDate;
  const dueDate = parsedDueDate || parsedStartDate;

  if (!subtasks.length || !startDate || !dueDate) {
    return (
      <section className="rounded-2xl border border-pink-100 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <h3 className="text-sm font-black text-[#10142d] dark:text-white">Project Timeline</h3>
        <p className="mt-2 text-xs font-bold text-slate-400">
          Add project dates and tasks to display the Gantt chart.
        </p>
      </section>
    );
  }

  const safeDueDate = dueDate < startDate ? startDate : dueDate;
  const totalDays = Math.max(1, Math.round((safeDueDate - startDate) / DAY_IN_MS) + 1);
  const tickCount = Math.min(5, totalDays);
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const dayOffset = tickCount === 1
      ? 0
      : Math.round((index * (totalDays - 1)) / (tickCount - 1));
    return {
      date: addDays(startDate, dayOffset),
      position: tickCount === 1 ? 0 : (index / (tickCount - 1)) * 100,
    };
  });

  const today = parseCalendarDate(new Date());
  const todayOffset = today ? Math.round((today - startDate) / DAY_IN_MS) : -1;
  const showToday = todayOffset >= 0 && todayOffset < totalDays;
  const todayPosition = totalDays === 1 ? 50 : (todayOffset / (totalDays - 1)) * 100;
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-pink-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col gap-3 border-b border-pink-100 px-5 py-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-[#c72fb2] dark:bg-pink-950/30">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M7 4v4M14 10v4M18 16v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-black text-[#10142d] dark:text-white">Project Timeline</h3>
              <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                Tasks are scheduled in sequence across the project dates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Completed</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#d946b8]" />In progress</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-200 dark:bg-violet-700" />Upcoming</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[220px_minmax(520px,1fr)] border-b border-slate-100 dark:border-neutral-800">
            <div className="border-r border-slate-100 px-5 py-3 dark:border-neutral-800">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Task</p>
              <p className="mt-1 text-[11px] font-black text-slate-600 dark:text-neutral-300">
                {completedCount} of {subtasks.length} completed
              </p>
            </div>
            <div className="relative h-[58px] px-5">
              <div className="absolute inset-x-5 top-3 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Schedule</span>
                <span className="text-[10px] font-black text-[#c72fb2]">
                  {formatDate(startDate, true)} – {formatDate(safeDueDate, true)}
                </span>
              </div>
              <div className="absolute inset-x-5 bottom-3 h-4">
                {ticks.map((tick, index) => (
                  <span
                    key={`${tick.date.toISOString()}-${index}`}
                    className={`absolute text-[9px] font-bold text-slate-400 ${index === 0 ? "translate-x-0" : index === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                    style={{ left: `${tick.position}%` }}
                  >
                    {formatDate(tick.date)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            {subtasks.map((subtask, index) => {
              const phaseStartOffset = Math.floor((index * totalDays) / subtasks.length);
              const phaseEndExclusive = Math.max(
                phaseStartOffset + 1,
                Math.floor(((index + 1) * totalDays) / subtasks.length),
              );
              const phaseEndOffset = Math.min(totalDays - 1, phaseEndExclusive - 1);
              const phaseStartDate = addDays(startDate, phaseStartOffset);
              const phaseEndDate = addDays(startDate, phaseEndOffset);
              const left = (index / subtasks.length) * 100;
              const width = 100 / subtasks.length;
              const phaseState = getPhaseState(subtasks, index, item?.status);

              return (
                <div
                  key={subtask.id || `${item?.id || "project"}-${index}`}
                  className="grid min-h-[62px] grid-cols-[220px_minmax(520px,1fr)] border-b border-slate-100 last:border-b-0 dark:border-neutral-800"
                >
                  <div className="flex min-w-0 items-center gap-3 border-r border-slate-100 px-5 py-3 dark:border-neutral-800">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-black ${phaseState === "completed" ? "bg-emerald-100 text-emerald-700" : phaseState === "active" ? "bg-pink-100 text-[#c72fb2]" : "bg-slate-100 text-slate-500"}`}>
                      {phaseState === "completed" ? (
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                          <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black text-[#10142d] dark:text-white" title={subtask.title}>{subtask.title}</span>
                      <span className="mt-0.5 block text-[9px] font-bold text-slate-400">{phaseLabels[phaseState]}</span>
                    </span>
                  </div>

                  <div
                    className="relative px-5 py-4"
                    style={{
                      backgroundImage: "linear-gradient(to right, rgba(226,232,240,0.7) 1px, transparent 1px)",
                      backgroundSize: "25% 100%",
                    }}
                  >
                    {showToday && (
                      <span
                        className="absolute inset-y-0 z-10 w-px bg-orange-400"
                        style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${todayPosition / 100})` }}
                        title={`Today, ${formatDate(today, true)}`}
                        aria-label={`Today, ${formatDate(today, true)}`}
                      />
                    )}
                    <div className="relative h-7">
                      <div
                        className="absolute top-0.5 px-0.5"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <div
                          className={`flex h-6 min-w-5 items-center justify-center rounded-md px-2 text-[9px] font-black ${phaseStyles[phaseState]}`}
                          title={`${subtask.title}: ${formatDate(phaseStartDate, true)} – ${formatDate(phaseEndDate, true)}`}
                        >
                          <span className="truncate">{formatDate(phaseStartDate)} – {formatDate(phaseEndDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectGanttChart;
