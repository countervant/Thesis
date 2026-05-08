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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-5 text-neutral-950">
      <section className="w-full max-w-[460px] bg-white px-7 py-8 text-center shadow-2xl ring-1 ring-black/10 sm:px-10">
        <div className="mx-auto grid h-14 w-14 place-items-center text-neutral-950">
          {imageIcon ? (
            <img src={imageIcon} alt="" className="h-14 w-14 object-contain" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-14 w-14" aria-hidden="true">
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
        <h2 className="mt-2 text-3xl font-bold text-neutral-950">{title}</h2>
        <p className="mt-4 text-sm font-medium text-neutral-700">{message}</p>

        <div className="mx-auto mt-6 flex max-w-[330px] flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 rounded-full bg-linear-to-r from-[#e04ab3] to-[#bd13c7] text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-full border border-neutral-300 bg-neutral-100 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
          >
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
