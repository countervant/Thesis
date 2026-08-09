export const notificationSettingsChangedEvent = "clientra:notification-settings-changed";

export const defaultNotificationSettings = {
  taskUpdates: true,
  projectUpdates: true,
  newsfeedActivity: true,
};

const getUserKey = (user) => user?._id || user?.id || user?.email || "guest";

export const getNotificationStorageKey = (user) =>
  `clientraNotificationSettings:${getUserKey(user)}`;

export const readNotificationSettings = (user) => {
  try {
    const savedSettings = JSON.parse(
      localStorage.getItem(getNotificationStorageKey(user)) || "{}"
    );
    return { ...defaultNotificationSettings, ...savedSettings };
  } catch {
    return { ...defaultNotificationSettings };
  }
};

export const writeNotificationSettings = (user, settings) => {
  const nextSettings = { ...defaultNotificationSettings, ...settings };
  localStorage.setItem(getNotificationStorageKey(user), JSON.stringify(nextSettings));
  window.dispatchEvent(
    new CustomEvent(notificationSettingsChangedEvent, {
      detail: { userId: getUserKey(user), settings: nextSettings },
    })
  );
  return nextSettings;
};

export const filterNotificationsByPreference = (notifications, settings) =>
  notifications.filter(
    (notification) =>
      !notification.preferenceId || settings[notification.preferenceId] !== false
  );
