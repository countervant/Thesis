import { useEffect, useRef, useState } from "react";

const AVATAR_RETRY_DELAYS_MS = [1000, 2500, 5000, 10000];

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
  const retryTimerRef = useRef(null);
  const [failure, setFailure] = useState({
    src: "",
    attempt: 0,
    retryReady: false,
    exhausted: false,
  });
  const isCurrentFailure = failure.src === avatarSrc;
  const imageFailed =
    isCurrentFailure && (failure.exhausted || !failure.retryReady);
  const retrySuffix =
    isCurrentFailure && failure.attempt > 0
      ? `${avatarSrc.includes("?") ? "&" : "?"}_avatarRetry=${failure.attempt}`
      : "";
  const imageSrc = `${avatarSrc}${retrySuffix}`;

  useEffect(() => () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
  }, []);

  const handleImageError = () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);

    const previousAttempt = isCurrentFailure ? failure.attempt : 0;
    const nextAttempt = previousAttempt + 1;
    if (nextAttempt > AVATAR_RETRY_DELAYS_MS.length) {
      setFailure({
        src: avatarSrc,
        attempt: previousAttempt,
        retryReady: false,
        exhausted: true,
      });
      return;
    }

    setFailure({
      src: avatarSrc,
      attempt: nextAttempt,
      retryReady: false,
      exhausted: false,
    });
    retryTimerRef.current = window.setTimeout(() => {
      setFailure((currentFailure) =>
        currentFailure.src === avatarSrc && currentFailure.attempt === nextAttempt
          ? { ...currentFailure, retryReady: true }
          : currentFailure
      );
      retryTimerRef.current = null;
    }, AVATAR_RETRY_DELAYS_MS[nextAttempt - 1]);
  };

  const handleImageLoad = () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  };

  if (avatarSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
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
