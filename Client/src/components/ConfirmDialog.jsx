import deleteIcon from "../assets/delete.png";
import logoutIcon from "../assets/logout.png";

const iconPaths = {
  done: "m5 12 4 4L19 6",
};

const imageIcons = {
  delete: deleteIcon,
  logout: logoutIcon,
};

const ConfirmDialog = ({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  icon = "logout",
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}) => {
  if (!isOpen) return null;

  const imageIcon = imageIcons[icon];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-5 text-neutral-950 backdrop-blur-sm">
      <section className="w-full max-w-[420px] rounded-3xl bg-white px-6 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:px-8 sm:py-9">
        <div className="mx-auto grid h-12 w-12 place-items-center text-neutral-950">
          {imageIcon ? (
            <img src={imageIcon} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-12 w-12" aria-hidden="true">
              <path
                d={iconPaths[icon] || iconPaths.done}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#242433] sm:text-3xl">{title}</h2>
        <p className="mt-3 text-base font-medium text-[#686776] sm:text-lg">{message}</p>

        <div className="mx-auto mt-7 grid max-w-[320px] grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-[#cfcfd8] bg-white px-4 text-sm font-black text-[#454451] transition hover:bg-neutral-50 sm:h-12 sm:text-base"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-linear-to-r from-[#ec3aa6] to-[#a719f5] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(190,31,190,0.28)] transition hover:brightness-105 sm:h-12 sm:text-base"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
