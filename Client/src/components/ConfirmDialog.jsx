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
      <section className="w-full max-w-[680px] rounded-[30px] bg-white px-7 py-10 text-center shadow-[0_28px_70px_rgba(15,23,42,0.32)] ring-1 ring-white/80 sm:rounded-[34px] sm:px-16 sm:py-16">
        <div className="mx-auto grid h-14 w-14 place-items-center text-neutral-950 sm:h-16 sm:w-16">
          {imageIcon ? (
            <img src={imageIcon} alt="" className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden="true">
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
        <h2 className="mt-5 text-4xl font-black tracking-tight text-[#242433] sm:text-5xl">{title}</h2>
        <p className="mt-5 text-xl font-medium text-[#686776] sm:text-2xl">{message}</p>

        <div className="mx-auto mt-10 grid max-w-[560px] grid-cols-2 gap-4 sm:mt-14 sm:gap-8">
          <button
            type="button"
            onClick={onCancel}
            className="h-14 rounded-2xl border border-[#cfcfd8] bg-white text-lg font-black text-[#454451] transition hover:bg-neutral-50 sm:h-20 sm:rounded-[24px] sm:text-2xl"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-14 rounded-2xl bg-linear-to-r from-[#ec3aa6] to-[#a719f5] text-lg font-black text-white shadow-[0_12px_24px_rgba(190,31,190,0.28)] transition hover:brightness-105 sm:h-20 sm:rounded-[24px] sm:text-2xl"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
