import React, { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

const App = () => {
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem("clientraTheme") === "dark"
    );
  }, []);

  return (
    <>
      <AppRoutes />
    </>
  );
};

export default App;
