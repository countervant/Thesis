import { useState } from "react";

const getInitials = (userOrName, fallback = "U") => {
  const firstName = userOrName?.firstName || "";
  const lastName = userOrName?.lastName || "";
  const explicitName =
    typeof userOrName === "string"
      ? userOrName
      : [firstName, lastName].filter(Boolean).join(" ") ||
        userOrName?.companyName ||
        userOrName?.contactPerson ||
        userOrName?.name ||
        userOrName?.email ||
        "";
  const words = String(explicitName).trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0].charAt(0)}${words[1].charAt(0)}`
      : words[0]?.slice(0, 2) || fallback;

  return initials.toUpperCase();
};

const InitialsAvatar = ({
  alt = "",
  className = "h-10 w-10",
  fallback = "U",
  initials,
  name,
  src,
  textClassName = "text-sm",
  user,
}) => {
  const avatarSrc = src || user?.avatar || "";
  const [failedSrc, setFailedSrc] = useState("");
  const imageFailed = failedSrc === avatarSrc;

  if (avatarSrc && !imageFailed) {
    return (
      <img
        src={avatarSrc}
        alt={alt}
        onError={() => setFailedSrc(avatarSrc)}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-full bg-linear-to-b from-[#df4bb4] to-[#c72fb2] font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.24)]`}
      aria-label={alt || undefined}
      role={alt ? "img" : undefined}
    >
      <span className={`${textClassName} leading-none`}>
        {initials || getInitials(user || name, fallback)}
      </span>
    </div>
  );
};

export default InitialsAvatar;
