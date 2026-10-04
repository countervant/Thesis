import { useEffect, useRef, useState } from "react";
import { resolveApiAssetUrl } from "../../utils/apiAssets.js";

const AVATAR_RETRY_DELAYS_MS = [2000, 5000, 10000];
const failedAvatarUrls = new Set();

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
  const avatarSrc = resolveApiAssetUrl(src || user?.avatar || "");
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const [failedSrc, setFailedSrc] = useState("");
  const isFailed = Boolean(avatarSrc && (failedAvatarUrls.has(avatarSrc) || failedSrc === avatarSrc));

  useEffect(() => {
    retryAttemptRef.current = 0;
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [avatarSrc]);

  const scheduleBackgroundRetry = (url) => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);

    const attempt = retryAttemptRef.current;
    if (attempt >= AVATAR_RETRY_DELAYS_MS.length) return;

    const delay = AVATAR_RETRY_DELAYS_MS[attempt];
    retryAttemptRef.current += 1;

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      const testImg = new Image();
      testImg.onload = () => {
        failedAvatarUrls.delete(url);
        setFailedSrc("");
      };
      testImg.onerror = () => {
        scheduleBackgroundRetry(url);
      };
      const retrySuffix = `${url.includes("?") ? "&" : "?"}_retry=${retryAttemptRef.current}`;
      testImg.src = `${url}${retrySuffix}`;
    }, delay);
  };

  const handleImageError = () => {
    if (avatarSrc) {
      failedAvatarUrls.add(avatarSrc);
      setFailedSrc(avatarSrc);
      scheduleBackgroundRetry(avatarSrc);
    }
  };

  const handleImageLoad = () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    if (avatarSrc) {
      failedAvatarUrls.delete(avatarSrc);
      setFailedSrc("");
    }
  };

  if (avatarSrc && !isFailed) {
    return (
      <img
        src={avatarSrc}
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
