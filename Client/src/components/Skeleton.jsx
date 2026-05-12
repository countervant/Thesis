const Skeleton = ({ className = "", ...props }) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`}
    {...props}
  />
);

export const SkeletonCard = ({ className = "" }) => (
  <div className={`rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800 ${className}`}>
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="mt-4 h-9 w-1/2" />
    <Skeleton className="mt-3 h-4 w-full" />
  </div>
);

export const SkeletonRows = ({ rows = 5, columns = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`skeleton-row-${rowIndex}`}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="px-5 py-4">
            <Skeleton className="h-4 w-full max-w-[140px]" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const DashboardSkeleton = () => (
  <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f1f1f1] px-4 py-5 dark:bg-neutral-950 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <section
          key={index}
          className="flex h-24 items-center gap-5 rounded-lg bg-white px-5 shadow-[0_2px_6px_rgba(219,39,119,0.28)] ring-1 ring-pink-100"
        >
          <Skeleton className="h-14 w-14 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-9 w-12" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        </section>
      ))}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.65fr_0.95fr]">
      <section className="h-[500px] overflow-hidden rounded-lg bg-white px-6 py-6 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
        <Skeleton className="mb-6 h-5 w-44" />
        <div className="grid grid-cols-[190px_1fr]">
          <div className="border-r border-neutral-200 pr-3">
            <div className="h-13" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid h-13 grid-cols-[1fr_26px_34px] items-center gap-3 border-t border-neutral-100"
              >
                <span className="flex items-center gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </span>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            ))}
          </div>
          <div className="min-w-[720px]">
            <div className="grid h-13 grid-cols-3 border-b border-neutral-100">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border-r border-neutral-100 px-8 last:border-r-0">
                  <Skeleton className="mx-auto mt-1 h-4 w-24" />
                  <div className="mt-3 grid grid-cols-7 gap-5">
                    {Array.from({ length: 7 }).map((__, dayIndex) => (
                      <Skeleton key={dayIndex} className="h-3 w-2" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <div key={rowIndex} className="relative h-13 border-b border-neutral-100">
                  <Skeleton
                    className="absolute top-1/2 h-8 -translate-y-1/2 rounded-md"
                    style={{
                      left: `${12 + rowIndex * 8}%`,
                      width: `${58 - rowIndex * 10}%`,
                    }}
                  />
                </div>
              ))}
              <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="h-[500px] rounded-lg bg-white px-6 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
        <Skeleton className="mb-6 h-5 w-44" />
        <div className="mx-auto h-64 w-64 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-7 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </span>
          ))}
        </div>
      </section>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      {["Working", "Not Working"].map((title) => (
        <section
          key={title}
          className="h-[260px] overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100"
        >
          <div className="px-7 pt-5">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-5 grid grid-cols-[1fr_1fr_1.3fr_1fr] gap-5 border-b border-slate-100 px-7 pb-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20" />
            ))}
          </div>
          <div className="space-y-4 px-7 py-4">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[1fr_1fr_1.3fr_1fr] items-center gap-5">
                <span className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </span>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="mt-7">
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
    <div className="mt-7 grid gap-5 border-t border-neutral-200 pt-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    <div className="mt-8 flex justify-end gap-3">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  </div>
);

export const FeedSkeleton = () => (
  <div className="space-y-5">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50 dark:bg-[#141414] dark:ring-neutral-800">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Skeleton className="mt-5 h-44 w-full rounded-lg" />
      </div>
    ))}
  </div>
);

export const TaskListSkeleton = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <article
        key={index}
        className="flex min-h-[95px] items-center gap-4 rounded-lg bg-white px-4 py-4 shadow-[0_3px_4px_rgba(190,65,158,0.35)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800 sm:px-5"
      >
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="hidden h-5 w-32 md:block" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </article>
    ))}
  </>
);

export const PersonCardSkeleton = ({ type = "employee" }) => (
  <article className="rounded-lg bg-white px-7 pb-4 pt-6 shadow-[0_3px_4px_rgba(190,65,158,0.35)] ring-1 ring-pink-50">
    <div className="flex items-center gap-4">
      <Skeleton className="h-13 w-13 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-5 w-24 rounded-full" />
      </div>
    </div>
    <div className="mt-6 space-y-2">
      {Array.from({ length: type === "client" ? 3 : 4 }).map((_, index) => (
        <span key={index} className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-52 max-w-full" />
        </span>
      ))}
    </div>
    <div className="mt-7 flex justify-end gap-2 border-t border-neutral-300 pt-3">
      {type === "client" && <Skeleton className="mr-auto h-4 w-28" />}
      <Skeleton className="h-8 w-8 rounded-md" />
      {type === "employee" && <Skeleton className="h-8 w-8 rounded-md" />}
    </div>
  </article>
);

export const PersonGridSkeleton = ({ type = "employee", rows = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <PersonCardSkeleton key={index} type={type} />
    ))}
  </>
);

export const BudgetSummarySkeleton = () => (
  <>
    {Array.from({ length: 3 }).map((_, index) => (
      <section
        key={index}
        className="flex h-24 items-center justify-center gap-8 rounded-lg border-b-2 border-[#e347b3] bg-white px-6 shadow-[0_3px_4px_rgba(219,39,119,0.22)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800"
      >
        <Skeleton className="h-16 w-16 rounded-md" />
        <div className="min-w-[110px] text-center">
          <Skeleton className="mx-auto h-8 w-28" />
          <Skeleton className="mx-auto mt-2 h-4 w-24" />
        </div>
      </section>
    ))}
  </>
);

export const BudgetChartsSkeleton = () => (
  <>
    <section className="flex min-h-[315px] flex-col rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
      <Skeleton className="h-5 w-44" />
      <div className="mt-6 flex flex-1 items-end gap-4">
        <div className="flex h-52 w-12 flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-10" />
          ))}
        </div>
        <div className="flex h-52 flex-1 items-end justify-center gap-8 border-b border-neutral-300 px-8">
          <Skeleton className="h-36 w-24 rounded-t-sm" />
          <Skeleton className="h-44 w-24 rounded-t-sm" />
        </div>
      </div>
      <div className="mt-9 flex justify-center gap-16">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </section>
    <section className="rounded-lg bg-white px-6 py-5 shadow-[0_3px_4px_rgba(219,39,119,0.3)] ring-1 ring-pink-50 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
      <Skeleton className="h-5 w-44" />
      <div className="mt-4 flex flex-col items-center">
        <div className="h-52 w-52 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-5 grid w-full grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </span>
          ))}
        </div>
      </div>
    </section>
  </>
);

export const NotificationSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-start gap-3 rounded-lg bg-white px-4 py-3 ring-1 ring-pink-50 dark:bg-neutral-900 dark:ring-neutral-800">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const AuthFormSkeleton = () => (
  <div className="w-full max-w-sm space-y-6 bg-transparent sm:max-w-md sm:space-y-8 dark:max-w-[528px] dark:rounded-2xl dark:border dark:border-pink-200/90 dark:px-10 dark:py-12 dark:shadow-[0_0_42px_rgba(219,39,119,0.22)]">
    <div className="mb-8 flex flex-col items-center sm:mb-10">
      <Skeleton className="h-32 w-32 rounded-full sm:h-40 sm:w-40 md:h-44 md:w-44" />
      <Skeleton className="mt-5 h-8 w-36" />
    </div>
    <div className="space-y-6 sm:space-y-8">
      <div className="border-b border-black pb-2 dark:border-white/40">
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex items-center border-b-2 border-gray-400 pb-2 dark:border-white/40 dark:bg-[#283241]">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="ml-3 h-5 w-5" />
      </div>
    </div>
    <Skeleton className="mt-6 h-12 w-full rounded-lg sm:mt-8" />
    <div className="flex justify-between gap-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

export const AuthScreenSkeleton = () => (
  <div data-auth-screen className="auth-screen flex min-h-screen flex-col md:flex-row dark:bg-[#111111]">
    <div className="relative hidden w-full bg-neutral-200 md:block md:min-h-screen md:w-1/2 dark:bg-neutral-900">
      <div className="absolute inset-0 bg-pink-500/35" />
      <div className="relative z-10 flex h-full flex-col justify-center space-y-8 px-12">
        <div>
          <Skeleton className="h-7 w-40 bg-white/40" />
          <Skeleton className="mt-3 h-12 w-80 bg-white/40" />
        </div>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-28 bg-white/40" />
            <Skeleton className="mt-3 h-4 w-full bg-white/40" />
            <Skeleton className="mt-2 h-4 w-5/6 bg-white/40" />
          </div>
          <div>
            <Skeleton className="h-6 w-24 bg-white/40" />
            <Skeleton className="mt-3 h-4 w-full bg-white/40" />
            <Skeleton className="mt-2 h-4 w-4/5 bg-white/40" />
          </div>
        </div>
      </div>
    </div>
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 px-6 py-12 sm:px-10 md:w-1/2 md:px-12 md:py-0 dark:bg-[#111111]">
      <AuthFormSkeleton />
    </div>
  </div>
);

export default Skeleton;
