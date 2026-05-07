import { useEffect, useMemo, useState } from "react";
import { clientAPI } from "../../../services/api.js";

const filters = ["All", "Active", "Inactive"];

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = `${words[0]?.charAt(0) || ""}${words[1]?.charAt(0) || ""}`;
  return initials.toUpperCase() || "CL";
};

const normalizeClient = (client) => ({
  id: client._id || client.id,
  initials: getInitials(client.contactPerson),
  name: client.contactPerson || "",
  status: client.isActive ? "Active" : "Inactive",
  company: client.companyName || "",
  email: client.email || "",
  phone: client.phone || "",
  service: client.service || "",
  address: client.address || "",
  notes: client.notes || "",
});

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

  if (name === "delete") {
    return (
      <svg {...props}>
        <path
          d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "add") {
    return (
      <svg {...props}>
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
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

const ClientCard = ({ client, onDelete }) => {
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(client)}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-900 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${client.name}`}
          >
            <Icon name="delete" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
};

const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await clientAPI.getAll();

        if (isMounted) {
          setClients(data.map(normalizeClient));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.message || "Unable to load clients.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const deleteClient = async (client) => {
    const shouldDelete = window.confirm(`Delete client "${client.name}"?`);
    if (!shouldDelete) return;

    try {
      setErrorMessage("");
      await clientAPI.delete(client.id);
      setClients((currentClients) =>
        currentClients.filter((currentClient) => currentClient.id !== client.id)
      )
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete client.");
    }
  };

  return (
        <div className="mx-auto max-w-[1500px]">
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
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100 lg:col-span-2">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] lg:col-span-2">
                Loading clients...
              </p>
            )}

            {!isLoading && visibleClients.length === 0 && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] lg:col-span-2">
                No clients found.
              </p>
            )}

            {!isLoading && visibleClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onDelete={deleteClient}
              />
            ))}
          </section>
        </div>
  );
};

export default AdminClients;
