import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

const SideBar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r-2 border-gray-300">
      {/* Logo header */}
      <div className="flex w-64 h-26 border-b-2 border-gray-300 flex-col">
        <div className="relative">
          <img src={logo} alt="Logo" className="w-22 h-22" />
        </div>
        <div className="absolute ml-19">
          <h1
            className="mt-6 text-2xl z-2"
            style={{ fontFamily: "Bruno Ace SC, sans-serif" }}
          >
            Clientra
          </h1>
        </div>
        <div className="absolute mt-16 ml-7 text-sm">
          <h2>Business Management</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center border border-purple-400 rounded-lg w-full h-10 text-gray-700 hover:bg-purple-50 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-300">
        <button
          onClick={handleLogout}
          className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default SideBar;