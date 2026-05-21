import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
const AuthenticationHelper = ({ link, Label, Label1, mobileInline = false }) => {
  const navigate = useNavigate();

  const handlePrimaryClick = (e) => {
    if (link !== "/register" && link !== "/") return;

    e.preventDefault();
    if (link === "/") {
      sessionStorage.setItem("clientraSuppressLoginAutofillOnce", "true");
    }
    const authScreen = document.querySelector("[data-auth-screen]");
    const transitionClass =
      link === "/register" ? "auth-screen-exit-register" : "auth-screen-exit-login";

    authScreen?.classList.add(transitionClass);

    window.setTimeout(() => {
      navigate(link);
    }, 420);
  };

  return (
    <>
      <div className={`flex gap-3 text-pink-500 ${
        mobileInline ? "flex-row justify-between text-sm font-bold md:font-medium" : "flex-col text-sm font-medium sm:flex-row sm:justify-between sm:gap-0"
      }`}>
        <Link to={link} onClick={handlePrimaryClick} className="hover:text-pink-600">
          {Label}
        </Link>
        {Label1 && (
          <Link to = '/ForgotPassword' className="hover:text-pink-600">
            {Label1}
          </Link>
        )}
      </div>
    </>
  );
};

export default AuthenticationHelper;
