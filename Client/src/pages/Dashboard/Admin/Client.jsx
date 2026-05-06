import { useMemo, useState } from "react";
import CLIENTRA2 from "../../../assets/CLIENTRA2.png";
import peejong from "../../../assets/peejong.png";

const navItems = [
  { id: "dashboard", label: "Home", icon: "dashboard" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "client", label: "Client", icon: "client" },
  { id: "employee", label: "Employee", icon: "employee" },
];

const initialClients = [
  {
    id: 1,
    initials: "JD",
    name: "John Doe",
    status: "Active",
    company: "TechChorp Inc.",
    email: "johndoe@techcorp.com",
    phone: "+63 9568913984",
    service: "Video Editing",
  },
  {
    id: 2,
    initials: "JD",
    name: "Jane Doe",
    status: "Inactive",
    company: "TechBiz Inc.",
    email: "janedoe@techbiz.com",
    phone: "+63 9568314594",
    service: "Graphic Design",
  },
];

const filters = ["All", "Active", "Inactive"];

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "dashboard") {
    return (
      <svg {...props}>
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          stroke="currentColor"
          strokeWidth="1.6"
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

  if (name === "client" || name === "employee") {
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
  }

  if (name === "search") {
    return (
      <svg {...props}>
        <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m15.5 15.5 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...props}>
        <path
          d="M6 18h12l-1.5-2v-4.2a4.5 4.5 0 0 0-9 0V16L6 18zM10 20h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="5" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...props}>
        <path
          d="M5 21V4h10v17M15 9h4v12M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1M3 21h18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...props}>
        <path
          d="M4 6h16v12H4zM4 7l8 6 8-6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path
          d="M7 4h3l1.3 4-2 1.2a10.4 10.4 0 0 0 5.5 5.5l1.2-2 4 1.3v3a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 5 6.2 2 2 0 0 1 7 4z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...props}>
        <path
          d="m14.7 5.3 4 4M4 20l4.4-1 10.2-10.2a2.8 2.8 0 0 0-4-4L4.4 15 4 20z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...props}>
        <path
          d="M9 5H5v14h4M15 8l4 4-4 4M19 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
};

const Sidebar = ({ activePage = "client", onLogout, onNavigate }) => (
  <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[230px] border-r border-neutral-300 bg-[#eeeeee] md:flex md:flex-col">
    <div className="border-b border-neutral-300 px-4 py-4">
      <div className="flex items-center gap-2">
        <img src={CLIENTRA2} alt="Clientra" className="h-10 w-10 object-contain" />
        <span
          className="text-xl uppercase text-neutral-950"
          style={{ fontFamily: "var(--font-bruno)" }}
        >
          Clientra
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-neutral-700">
        Business Management
      </p>
    </div>

    <nav className="flex flex-1 flex-col gap-4 px-3 pt-10">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate?.(item.id)}
          className={`flex h-11 items-center gap-4 rounded-lg px-6 text-sm font-medium transition ${
            activePage === item.id
              ? "bg-linear-to-r from-[#8424d2] to-[#e347b3] text-white shadow-[0_4px_7px_rgba(126,34,206,0.35)]"
              : "text-neutral-700 hover:bg-white hover:text-[#c72fb2]"
          }`}
        >
          <Icon name={item.icon} className="h-6 w-6 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>

    <button
      type="button"
      onClick={onLogout}
      className="mb-8 ml-12 flex items-center gap-10 text-sm text-white transition hover:text-[#c72fb2]"
    >
      <span>Log out</span>
      <Icon name="logout" className="h-6 w-6" />
    </button>
  </aside>
);

const FilterButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-9 rounded-lg px-5 text-sm font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition ${
      active
        ? "bg-linear-to-r from-[#8424d2] to-[#e347b3] text-white"
        : "bg-white text-neutral-800 hover:bg-pink-50 hover:text-[#c72fb2]"
    }`}
  >
    {children}
  </button>
);

const ClientCard = ({ client, onEdit }) => {
  const isActive = client.status === "Active";

  return (
    <article className="relative rounded-lg bg-white px-6 pb-4 pt-5 shadow-[0_3px_4px_rgba(190,65,158,0.35)] ring-1 ring-pink-50">
      {client.id === 1 && (
        <Icon
          name="bell"
          className="absolute left-3 top-2 h-5 w-5 text-neutral-950"
        />
      )}

      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-b from-[#8b2ed0] to-[#e04ab3] text-lg font-bold text-white">
          {client.initials}
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{client.name}</h2>
          <span
            className={`mt-1 inline-flex h-5 items-center rounded-full px-4 text-xs font-medium shadow-[0_2px_5px_rgba(0,0,0,0.18)] ${
              isActive
                ? "bg-[#d8ffe3] text-[#1d7f3f]"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {client.status}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-1 text-xs font-medium text-neutral-700">
        <p className="flex items-center gap-2">
          <Icon name="building" className="h-4 w-4 text-neutral-600" />
          {client.company}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="mail" className="h-4 w-4 text-neutral-600" />
          {client.email}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="phone" className="h-4 w-4 text-neutral-600" />
          {client.phone}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-neutral-300 pt-3 text-xs font-medium text-neutral-700">
        <span>{client.service}</span>
        <button
          type="button"
          onClick={() => onEdit(client)}
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-900 transition hover:bg-pink-50 hover:text-[#c72fb2]"
          aria-label={`Edit ${client.name}`}
        >
          <Icon name="edit" className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
};

const AdminClients = ({ activePage = "client", onLogout, onNavigate }) => {
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const visibleClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesFilter =
        selectedFilter === "All" || client.status === selectedFilter;
      const matchesSearch = [
        client.name,
        client.company,
        client.email,
        client.phone,
        client.service,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [clients, searchTerm, selectedFilter]);

  const countFor = (filter) => {
    if (filter === "All") {
      return clients.length;
    }

    return clients.filter((client) => client.status === filter).length;
  };

  const editClient = (client) => {
    const name = window.prompt("Client name", client.name);

    if (!name?.trim()) {
      return;
    }

    const status =
      window.prompt("Status: Active or Inactive", client.status) || client.status;
    const company = window.prompt("Company", client.company) || client.company;
    const email = window.prompt("Email", client.email) || client.email;
    const phone = window.prompt("Phone", client.phone) || client.phone;
    const service = window.prompt("Service", client.service) || client.service;

    setClients((currentClients) =>
      currentClients.map((currentClient) =>
        currentClient.id === client.id
          ? {
              ...currentClient,
              name: name.trim(),
              status: status === "Active" ? "Active" : "Inactive",
              company: company.trim(),
              email: email.trim(),
              phone: phone.trim(),
              service: service.trim(),
            }
          : currentClient
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <Sidebar
        activePage={activePage}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="px-4 pb-12 pt-8 md:ml-[230px] md:px-10 lg:px-12">
        <div className="mx-auto max-w-[1060px]">
          <header className="flex items-start justify-between gap-5">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Clients
              </h1>
              <p className="mt-2 text-xs font-medium text-neutral-600">
                Manage your client relationships
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-px bg-neutral-300" />
              <img
                src={peejong}
                alt="User"
                className="h-10 w-10 rounded-full bg-slate-200 object-cover"
              />
            </div>
          </header>

          <section className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search clients</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search clients..."
                className="h-9 w-full rounded-lg border border-neutral-500 bg-white px-4 pr-10 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100"
              />
              <Icon
                name="search"
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-800"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <FilterButton
                  key={filter}
                  active={selectedFilter === filter}
                  onClick={() => setSelectedFilter(filter)}
                >
                  {filter} ({countFor(filter)})
                </FilterButton>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {visibleClients.map((client) => (
              <ClientCard key={client.id} client={client} onEdit={editClient} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminClients;
