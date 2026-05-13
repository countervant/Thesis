import { useEffect, useMemo, useState } from "react";
import { employeeAPI, getApiErrorMessage } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import InitialsAvatar from "../../../components/InitialsAvatar.jsx";
import { getCountryFlag } from "../../../utils/countries.js";
import { PersonGridSkeleton } from "../../../components/Skeleton.jsx";

const filters = ["All", "Active", "Inactive"];

const getInitials = (firstName = "", lastName = "") => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials.toUpperCase() || "EM";
};

const normalizeEmployee = (employee) => ({
  id: employee._id || employee.id,
  initials: getInitials(employee.firstName, employee.lastName),
  name: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
  avatar: employee.avatar || "",
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
    className={`h-12 min-w-[128px] rounded-xl border px-6 text-sm font-bold shadow-[0_2px_6px_rgba(190,65,158,0.12)] transition ${
      active
        ? "border-transparent bg-linear-to-r from-[#df4bb4] to-[#c72fb2] text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)]"
        : "border-pink-100 bg-white text-neutral-800 hover:bg-pink-50 hover:text-[#c72fb2] dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-200"
    }`}
  >
    {children}
  </button>
);

const EmployeeCard = ({ employee, onDelete, onEdit }) => {
  const isActive = employee.status === "Active";
  const countryFlag = getCountryFlag(employee.country);

  return (
    <article className="flex min-h-[300px] flex-col rounded-2xl border border-pink-100 bg-white px-8 pb-6 pt-7 shadow-[0_8px_22px_rgba(190,65,158,0.18)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
      <div className="flex items-start gap-6">
        <InitialsAvatar
          className="h-16 w-16"
          fallback="EM"
          initials={employee.initials}
          name={employee.name}
          src={employee.avatar}
          textClassName="text-2xl"
        />
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-xl font-extrabold text-neutral-950 dark:text-white">{employee.name}</h2>
            {countryFlag && (
              <img
                src={countryFlag}
                alt=""
                aria-label={employee.country}
                className="h-4 w-7 shrink-0 rounded-[2px] object-contain"
                title={employee.country}
              />
            )}
          </div>
          <span
            className={`mt-3 inline-flex h-7 items-center gap-2 rounded-full px-4 text-xs font-bold ${
              isActive
                ? "bg-[#d8ffe3] text-[#1d9a4f]"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-[#20bd5a]" : "bg-neutral-400"}`} />
            {employee.status}
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4 text-sm font-semibold text-slate-600 dark:text-neutral-300">
        <p className="flex items-center gap-2">
          <Icon name="person" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {employee.role}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="mail" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {employee.email}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="phone" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {employee.phone}
        </p>
      </div>

      <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => onEdit(employee)}
          className="grid h-12 w-12 place-items-center rounded-xl bg-pink-50 text-[#c72fb2] transition hover:bg-pink-100"
          aria-label={`Edit ${employee.name}`}
        >
          <Icon name="edit" className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(employee)}
          className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
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
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

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
          setErrorMessage(getApiErrorMessage(error, "Unable to load employees."));
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
        <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-7 dark:bg-neutral-950 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
                 <h1
                className="text-4xl leading-none text-neutral-950 dark:text-white"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Employees
              </h1>
              <p className="mt-2 text-base font-semibold text-slate-500">
                Manage and organize your employee records
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onAddEmployee}
                className="flex h-14 items-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-6 text-sm font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105"
              >
                <Icon name="add" className="h-5 w-5" />
                <span>Add Employee</span>
              </button>

              <button
                type="button"
                onClick={exportEmployees}
                className="h-14 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-8 text-sm font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105"
              >
                Export
              </button>
            </div>
          </header>

          <section className="mt-9 flex flex-col gap-5 xl:flex-row xl:items-center">
            <label className="relative max-w-[760px] flex-1">
              <span className="sr-only">Search employees</span>
              <Icon
                name="search"
                className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employees by name, email, role..."
                className="h-14 w-full rounded-xl border border-pink-100 bg-white pl-14 pr-5 text-sm font-semibold text-neutral-800 shadow-[0_2px_6px_rgba(190,65,158,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
              />
            </label>

            <div className="flex flex-wrap gap-4">
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

          <section className="mt-9 grid gap-7 xl:grid-cols-2">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100 lg:col-span-2">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <PersonGridSkeleton type="employee" rows={4} />
            )}

            {!isLoading && visibleEmployees.length === 0 && (
              <p className="rounded-xl border border-pink-100 bg-white px-5 py-5 text-sm font-bold text-neutral-700 shadow-[0_8px_22px_rgba(190,65,158,0.12)] xl:col-span-2">
                No employees found.
              </p>
            )}

            {!isLoading && visibleEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onDelete={setEmployeeToDelete}
                onEdit={editEmployee}
              />
            ))}
          </section>
          <ConfirmDialog
            confirmLabel="Yes , delete"
            icon="delete"
            isOpen={Boolean(employeeToDelete)}
            message={`Delete employee "${employeeToDelete?.name || ""}"?`}
            onCancel={() => setEmployeeToDelete(null)}
            onConfirm={async () => {
              const employee = employeeToDelete;
              setEmployeeToDelete(null);
              if (employee) await deleteEmployee(employee);
            }}
            title="Delete"
          />
          </div>
        </div>
  );
};

export default AdminEmployees;
