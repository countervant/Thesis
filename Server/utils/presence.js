export const PRESENCE_TIMEOUT_MS = 90 * 1000;

export const isUserOnline = (user, now = Date.now()) => {
  if (!user?.isOnline || user?.showOnlineStatus === false || !user?.lastSeen) {
    return false;
  }

  const lastSeenTime = new Date(user.lastSeen).getTime();
  return (
    Number.isFinite(lastSeenTime) &&
    now >= lastSeenTime &&
    now - lastSeenTime <= PRESENCE_TIMEOUT_MS
  );
};
