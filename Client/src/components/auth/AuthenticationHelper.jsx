import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
const AuthenticationHelper = ({ link, Label, Label1 }) => {
  const navigate = useNavigate();

  const handlePrimaryClick = (e) => {
    if (link !== "/register" && link !== "/") return;

    e.preventDefault();
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
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 text-sm font-medium text-pink-500">
        <Link to={link} onClick={handlePrimaryClick} className="hover:text-pink-600">
          {Label}
        </Link>
        <Link to = '/ForgotPassword' className="hover:text-pink-600">
          {Label1}
        </Link>
      </div>
    </>
  );
};

export default AuthenticationHelper;
