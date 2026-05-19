export const getAuthErrorMessage = (error, fallback) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ECONNABORTED") {
    return "Server request timed out. Make sure the backend is running and MongoDB is connected.";
  }

  if (error.request && !error.response) {
    return "Cannot reach the backend server. Check VITE_API_URL and make sure the deployed backend health endpoint is online.";
  }

  return fallback;
};
