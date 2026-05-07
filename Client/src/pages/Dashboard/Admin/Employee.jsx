import { useEffect, useMemo, useState } from "react";
import { employeeAPI } from "../../../services/api.js";

const filters = ["All", "Active", "Inactive"];

const getInitials = (firstName = "", lastName = "") => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials.toUpperCase() || "EM";
};

const normalizeEmployee = (employee) => ({
  id: employee._id || employee.id,
  initials: getInitials(employee.firstName, employee.lastName),
  name: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
  status: employee.isActive ? "Active" : "Inactive",
  role: employee.position || "Employee",
  position: employee.position || "",
  email: employee.email || "",
  country: employee.country || "",
  phone: employee.phone || "",
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

  if (name === "person") {
    return (
      <svg {...props}>
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <path
          d="M4.5 17.5c.5-3.1 2-4.6 4.5-4.6s4 1.5 4.5 4.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="16.5" cy="8" r="2.3" fill="currentColor" />
        <path
          d="M14 17.4c.5-2 1.6-3 3.3-3 1.8 0 2.9 1 3.3 3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
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

const EmployeeCard = ({ employee, onDelete, onEdit }) => {
  const isActive = employee.status === "Active";

  return (
    <article className="rounded-lg bg-white px-7 pb-4 pt-6 shadow-[0_3px_4px_rgba(190,65,158,0.35)] ring-1 ring-pink-50">
      <div className="flex items-center gap-4">
        <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-linear-to-b from-[#8b2ed0] to-[#e04ab3] text-lg font-bold text-white">
          {employee.initials}
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{employee.name}</h2>
          <span
            className={`mt-1 inline-flex h-5 items-center rounded-full px-4 text-xs font-medium shadow-[0_2px_5px_rgba(0,0,0,0.18)] ${
              isActive
                ? "bg-[#d8ffe3] text-[#1d7f3f]"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {employee.status}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-1 text-xs font-medium text-neutral-900">
        <p className="flex items-center gap-2">
          <Icon name="person" className="h-4 w-4" />
          {employee.role}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="mail" className="h-4 w-4" />
          {employee.email}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="phone" className="h-4 w-4" />
          {employee.phone}
        </p>
      </div>

      <div className="mt-7 flex justify-end gap-2 border-t border-neutral-400 pt-3">
        <button
          type="button"
          onClick={() => onEdit(employee)}
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-900 transition hover:bg-pink-50 hover:text-[#c72fb2]"
          aria-label={`Edit ${employee.name}`}
        >
          <Icon name="edit" className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(employee)}
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-900 transition hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${employee.name}`}
        >
          <Icon name="delete" className="h-6 w-6" />
        </button>
      </div>
    </article>
  );
};

const AdminEmployees = ({
  onAddEmployee,
  onEditEmployee,
  refreshKey = 0,
}) => {
  const [employees, setEmployees] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;

    const loadEmployees = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await employeeAPI.getAll();

        if (isMounted) {
          setEmployees(data.map(normalizeEmployee));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load employees."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const visibleEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesFilter =
        selectedFilter === "All" || employee.status === selectedFilter;
      const matchesSearch = [
        employee.name,
        employee.status,
        employee.role,
        employee.email,
        employee.country,
        employee.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [employees, searchTerm, selectedFilter]);

  const countFor = (filter) => {
    if (filter === "All") {
      return employees.length;
    }

    return employees.filter((employee) => employee.status === filter).length;
  };

  const editEmployee = (employee) => {
    onEditEmployee?.(employee);
  };

  const deleteEmployee = async (employee) => {
    const shouldDelete = window.confirm(`Delete employee "${employee.name}"?`);
    if (!shouldDelete) return;

    try {
      setErrorMessage("");
      await employeeAPI.delete(employee.id);
      setEmployees((currentEmployees) =>
        currentEmployees.filter((currentEmployee) => currentEmployee.id !== employee.id)
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete employee.");
    }
  };

  const exportEmployees = () => {
    const header = ["Name", "Status", "Role", "Email", "Country", "Phone"];
    const rows = visibleEmployees.map((employee) => [
      employee.name,
      employee.status,
      employee.role,
      employee.email,
      employee.country,
      employee.phone,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Employee
              </h1>
              <p className="mt-2 text-xs font-medium text-neutral-800">
                View your current Employee here
              </p>
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={onAddEmployee}
                className="flex h-12 items-center gap-2 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-5 text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                <Icon name="add" className="h-5 w-5" />
                <span>Add Employee</span>
              </button>

              <button
                type="button"
                onClick={exportEmployees}
                className="h-12 w-38 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] text-base font-medium text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105"
              >
                Export
              </button>
            </div>
          </header>

          <section className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search employees</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Employee..."
                className="h-9 w-full rounded-lg border border-neutral-600 bg-white px-4 pr-10 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100"
              />
              <Icon
                name="search"
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-950"
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

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100 lg:col-span-2">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] lg:col-span-2">
                Loading employees...
              </p>
            )}

            {!isLoading && visibleEmployees.length === 0 && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] lg:col-span-2">
                No employees found.
              </p>
            )}

            {!isLoading && visibleEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onDelete={deleteEmployee}
                onEdit={editEmployee}
              />
            ))}
          </section>
        </div>
  );
};

export default AdminEmployees;
