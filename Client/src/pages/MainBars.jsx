import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CLIENTRA2 from "../assets/CLIENTRA2.png";
import defaultProfile from "../assets/default-profile.png";
import { useAuth } from "../context/AuthContext.jsx";

const sideNavItems = [
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "client", label: "Client", icon: "client" },
  { id: "employee", label: "Employee", icon: "employee" },
];

const topNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "newsfeed", label: "Newsfeed", icon: "monitor" },
  { id: "messages", label: "Messages", icon: "message" },
];

const Icon = ({ name, className = "h-6 w-6" }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "grid") {
    return (
      <svg {...props}>
        <path
          d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (name === "monitor") {
    return (
      <svg {...props}>
        <path
          d="M5 5h14v10H5zM9 20h6M12 15v5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...props}>
        <path
          d="M5 6h14v10H9l-4 3V6z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg {...props}>
        <path
          d="M8 4h8l1 3H7l1-3zM6 7h12v13H6zM9 12l1.5 1.5L14 10M9 17h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "budget") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M12.5 18.5c.6-2.4 2.1-3.7 4.4-3.7 2.4 0 3.9 1.3 4.4 3.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

const UserAvatar = ({ user }) => {
  return (
    <img
      src={user?.avatar || defaultProfile}
      alt="User"
      onError={(event) => {
        event.currentTarget.src = defaultProfile;
      }}
      className="h-8 w-8 rounded-full object-cover"
    />
  );
};

const MainBars = ({ activePage, children, onLogout, onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <header className="fixed inset-x-0 top-0 z-30 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-neutral-300 bg-[#f5f5f5] px-4">
        <button
          type="button"
          onClick={() => onNavigate?.("dashboard")}
          className="flex items-center gap-2 justify-self-start"
        >
          <img src={CLIENTRA2} alt="Clientra" className="h-10 w-10 object-contain" />
          <span
            className="text-2xl uppercase text-neutral-950"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Clientra
          </span>
        </button>

        <nav className="flex items-center gap-16 sm:gap-24">
          {topNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`grid h-11 w-11 place-items-center rounded-lg transition ${
                activePage === item.id
                  ? "text-[#df4bb4]"
                  : "text-neutral-950 hover:bg-white hover:text-[#c72fb2]"
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon name={item.icon} className="h-6 w-6" />
            </button>
          ))}
        </nav>

        <div ref={accountMenuRef} className="relative justify-self-end">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-neutral-900 shadow-sm transition hover:border-pink-200 hover:text-[#c72fb2]"
            aria-label="Account menu"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <UserAvatar user={user} />
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d="m6 8 4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isAccountMenuOpen && (
            <div
              className="absolute right-0 top-14 z-40 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-sm text-neutral-800 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                role="menuitem"
              >
                Profile
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                role="menuitem"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-[90px] border-r border-neutral-300 bg-[#f5f5f5] md:block">
        <nav className="flex flex-col items-center gap-5 pt-9">
          {sideNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex w-16 flex-col items-center gap-1 rounded-xl py-3 text-xs transition ${
                activePage === item.id
                  ? "bg-linear-to-b from-[#df4bb4] to-[#7e22ce] text-white shadow-[0_4px_8px_rgba(126,34,206,0.35)]"
                  : "text-neutral-900 hover:bg-white hover:text-[#c72fb2]"
              }`}
            >
              <Icon name={item.icon} className="h-6 w-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="px-4 pb-10 pt-24 md:ml-[90px] md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default MainBars;
