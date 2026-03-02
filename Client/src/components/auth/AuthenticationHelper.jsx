import React from "react";
import { Link } from "react-router-dom";

const AuthenticationHelper = ({ link, Label, Label1, onToggle }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 text-sm font-medium text-pink-500">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="hover:text-pink-600 text-left cursor-pointer"
        >
          {Label}
        </button>
      ) : (
        <Link to={link} className="hover:text-pink-600">
          {Label}
        </Link>
      )}
      {Label1 ? (
        <Link to="/forgot-password" className="hover:text-pink-600">
          {Label1}
        </Link>
      ) : null}
    </div>
  );
};

export default AuthenticationHelper;
