import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Welcome from "../../components/auth/Welcome.jsx";
import LoginPage from "../../components/auth/LoginPage.jsx";
import RegisterPage from "../../components/auth/RegisterPage.jsx";

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(location.pathname !== "/register");

  useEffect(() => {
    setIsLogin(location.pathname !== "/register");
  }, [location.pathname]);

  const toggle = () => {
    const next = !isLogin;
    setIsLogin(next);
    navigate(next ? "/" : "/register", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-100">
      {/* Login form – RIGHT half */}
      <div
        className={`absolute inset-y-0 right-0 w-full md:w-1/2 transition-all duration-700 ease-in-out ${
          isLogin
            ? "opacity-100 translate-x-0 pointer-events-auto z-10"
            : "opacity-0 translate-x-10 pointer-events-none z-0"
        }`}
      >
        <LoginPage onToggle={toggle} />
      </div>

      {/* Register form – LEFT half */}
      <div
        className={`absolute inset-y-0 left-0 w-full md:w-1/2 transition-all duration-700 ease-in-out ${
          !isLogin
            ? "opacity-100 translate-x-0 pointer-events-auto z-10"
            : "opacity-0 -translate-x-10 pointer-events-none z-0"
        }`}
      >
        <RegisterPage onToggle={toggle} />
      </div>

      {/* Welcome overlay – slides left ↔ right */}
      <div
        className={`hidden md:block absolute inset-y-0 left-0 w-1/2 z-20 transition-transform duration-700 ease-in-out ${
          isLogin ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Welcome text={isLogin ? "Welcome to" : "Create Account"} />
      </div>
    </div>
  );
};

export default AuthPage;
