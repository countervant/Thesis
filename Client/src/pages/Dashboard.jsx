import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AdminDashboard from "./Dashboard/Admin/Home.jsx";
import AdminTasks from "./Dashboard/Admin/Tasks.jsx";
import AdminBudget from "./Dashboard/Admin/Budget.jsx";
import AdminClients from "./Dashboard/Admin/Client.jsx";
import AdminEmployees from "./Dashboard/Admin/Employee.jsx";
import AdminAddTask from "./Dashboard/Admin/Addtask.jsx";
import AdminAddBudget from "./Dashboard/Admin/Addbudget.jsx";
import AdminAddEmployee from "./Dashboard/Admin/Addemployee.jsx";
import Newsfeed from "./newsfeed.jsx";
import MainBars from "./MainBars.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const adminPages = new Set([
  "dashboard",
  "newsfeed",
  "messages",
  "tasks",
  "add-task",
  "edit-task",
  "budget",
  "add-budget",
  "edit-budget",
  "client",
  "employee",
  "add-employee",
  "edit-employee",
]);

const MessagesPanel = () => (
  <div className="mx-auto max-w-[1500px]">
    <section className="rounded-lg bg-white px-8 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
      <h1
        className="text-3xl uppercase leading-none text-neutral-950"
        style={{ fontFamily: "var(--font-bruno)" }}
      >
        Messages
      </h1>
      <p className="mt-3 text-sm font-medium text-neutral-600">
        Your conversations will appear here.
      </p>
    </section>
  </div>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = user?.role;
  const requestedAdminPage = searchParams.get("page");
  const adminPage =
    role === "admin" && adminPages.has(requestedAdminPage)
      ? requestedAdminPage
      : "dashboard";
  const initialLocalPage = ["dashboard", "newsfeed", "messages", "tasks"].includes(
    location.state?.page
  )
    ? location.state.page
    : "dashboard";
  const [localPage, setLocalPage] = useState(initialLocalPage);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingBudgetEntry, setEditingBudgetEntry] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [employeeRefreshKey, setEmployeeRefreshKey] = useState(0);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const handleAdminNavigate = (page, options = {}) => {
    if (!adminPages.has(page)) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (page === "dashboard") {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page);
    }

    setSearchParams(nextParams, { replace: options.replace === true });
  };

  const handleTaskCreated = () => {
    setTaskRefreshKey((currentKey) => currentKey + 1);
    setEditingTask(null);
    handleAdminNavigate("tasks", { replace: true });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    handleAdminNavigate("edit-task");
  };

  const handleBudgetSaved = () => {
    setBudgetRefreshKey((currentKey) => currentKey + 1);
    setEditingBudgetEntry(null);
    handleAdminNavigate("budget", { replace: true });
  };

  const handleAddBudgetEntry = () => {
    setEditingBudgetEntry(null);
    handleAdminNavigate("add-budget");
  };

  const handleEditBudgetEntry = (entry) => {
    setEditingBudgetEntry(entry);
    handleAdminNavigate("edit-budget");
  };

  const handleEmployeeSaved = () => {
    setEmployeeRefreshKey((currentKey) => currentKey + 1);
    setEditingEmployee(null);
    handleAdminNavigate("employee", { replace: true });
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    handleAdminNavigate("add-employee");
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    handleAdminNavigate("edit-employee");
  };

  if (role === "admin") {
    const shellActivePage =
      adminPage === "add-task" || adminPage === "edit-task"
        ? "tasks"
        : adminPage === "add-budget" || adminPage === "edit-budget"
          ? "budget"
        : adminPage === "add-employee" || adminPage === "edit-employee"
          ? "employee"
          : adminPage;

    let adminContent = (
      <AdminDashboard activePage={adminPage} />
    );

    if (adminPage === "tasks" || adminPage === "add-task" || adminPage === "edit-task") {
      adminContent = (
        <>
          <AdminTasks
            onEditTask={handleEditTask}
            onNavigate={handleAdminNavigate}
            refreshKey={taskRefreshKey}
          />
          {(adminPage === "add-task" || adminPage === "edit-task") && (
            <AdminAddTask
              onNavigate={handleAdminNavigate}
              onTaskCreated={handleTaskCreated}
              task={adminPage === "edit-task" ? editingTask : null}
            />
          )}
        </>
      );
    } else if (
      adminPage === "budget" ||
      adminPage === "add-budget" ||
      adminPage === "edit-budget"
    ) {
      adminContent = (
        <>
          <AdminBudget
            onAddEntry={handleAddBudgetEntry}
            onEditEntry={handleEditBudgetEntry}
            refreshKey={budgetRefreshKey}
          />
          {(adminPage === "add-budget" || adminPage === "edit-budget") && (
            <AdminAddBudget
              entry={adminPage === "edit-budget" ? editingBudgetEntry : null}
              onBudgetSaved={handleBudgetSaved}
              onNavigate={handleAdminNavigate}
            />
          )}
        </>
      );
    } else if (adminPage === "newsfeed") {
      adminContent = <Newsfeed />;
    } else if (adminPage === "messages") {
      adminContent = <MessagesPanel />;
    } else if (adminPage === "client") {
      adminContent = <AdminClients />;
    } else if (
      adminPage === "employee" ||
      adminPage === "add-employee" ||
      adminPage === "edit-employee"
    ) {
      adminContent = (
        <>
          <AdminEmployees
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            refreshKey={employeeRefreshKey}
          />
          {(adminPage === "add-employee" || adminPage === "edit-employee") && (
            <AdminAddEmployee
              employee={adminPage === "edit-employee" ? editingEmployee : null}
              onEmployeeSaved={handleEmployeeSaved}
              onNavigate={handleAdminNavigate}
            />
          )}
        </>
      );
    }

    return (
      <>
        <MainBars
          activePage={shellActivePage}
          onLogout={handleLogout}
          onNavigate={handleAdminNavigate}
        >
          {adminContent}
        </MainBars>
        <ConfirmDialog
          confirmLabel="Yes , log out"
          icon="logout"
          isOpen={isLogoutDialogOpen}
          message="Are you sure you want to log out?"
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={confirmLogout}
          title="Logout"
        />
      </>
    );
  }

  const regularContent =
    localPage === "newsfeed" ? (
      <Newsfeed />
    ) : localPage === "tasks" ? (
      <AdminTasks />
    ) : localPage === "messages" ? (
      <MessagesPanel />
    ) : (
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-lg bg-white px-8 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
          <h1
            className="text-3xl uppercase leading-none text-neutral-950"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Dashboard
          </h1>
          <p className="mt-3 text-sm font-medium text-neutral-600">
            You are logged in as <strong>{role}</strong>.
          </p>

          {role === "employee" && (
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
              <h2 className="font-semibold text-blue-800">Employee Portal</h2>
              <p className="mt-2 text-sm text-blue-600">
                Access your assigned tasks, manage client interactions, and update records.
              </p>
            </div>
          )}

          {role === "client" && (
            <div className="mt-6 rounded-lg border border-green-100 bg-green-50 px-5 py-4">
              <h2 className="font-semibold text-green-800">Client Portal</h2>
              <p className="mt-2 text-sm text-green-600">
                View your account information, submit requests, and track your service status.
              </p>
            </div>
          )}
        </section>
      </div>
    );

  return (
    <>
      <MainBars
        activePage={localPage}
        onLogout={handleLogout}
        onNavigate={setLocalPage}
      >
        {regularContent}
      </MainBars>
      <ConfirmDialog
        confirmLabel="Yes , log out"
        icon="logout"
        isOpen={isLogoutDialogOpen}
        message="Are you sure you want to log out?"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
        title="Logout"
      />
    </>
  );
};

export default Dashboard;
