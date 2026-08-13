import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
const AuthenticationHelper = ({ link, Label, Label1, mobileInline = false }) => {
  const navigate = useNavigate();
  const navigationTimerRef = useRef(null);

  useEffect(() => () => {
    if (navigationTimerRef.current) window.clearTimeout(navigationTimerRef.current);
  }, []);

  const navigateWithAnimation = (e, target, transitionClass) => {
    e.preventDefault();
    if (target === "/") {
      sessionStorage.setItem("clientraSuppressLoginAutofillOnce", "true");
    }
    const authScreen = document.querySelector("[data-auth-screen]");
    authScreen?.classList.add(transitionClass);

    if (navigationTimerRef.current) window.clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = window.setTimeout(() => {
      navigate(target);
    }, 420);
  };

  const handlePrimaryClick = (e) => {
    if (link !== "/register" && link !== "/") return;

    navigateWithAnimation(
      e,
      link,
      link === "/register" ? "auth-screen-exit-register" : "auth-screen-exit-login"
    );
  };

  const handleForgotPasswordClick = (e) => {
    navigateWithAnimation(e, "/ForgotPassword", "auth-screen-exit-register");
  };

  return (
    <>
      <div className={`flex gap-3 text-pink-500 ${
        mobileInline ? "flex-row justify-between text-sm font-bold md:font-medium" : "flex-col text-sm font-medium sm:flex-row sm:justify-between sm:gap-0"
      }`}>
        <Link to={link} onClick={handlePrimaryClick} className="inline-flex min-h-11 items-center hover:text-pink-600">
          {Label}
        </Link>
        {Label1 && (
          <Link
            to="/ForgotPassword"
            onClick={handleForgotPasswordClick}
            className="inline-flex min-h-11 items-center hover:text-pink-600"
          >
            {Label1}
          </Link>
        )}
      </div>
    </>
  );
};

export default AuthenticationHelper;
