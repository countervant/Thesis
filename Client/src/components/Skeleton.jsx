const Skeleton = ({ className = "" }) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`}
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
  <div className="mt-7 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
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

export default Skeleton;
