import SideBar from "../components/SideBar";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <SideBar />

      <main className="flex-1 p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, <strong>{user?.email}</strong>. You are logged in as{" "}
            <strong>{user?.type}</strong>.
          </p>
        </div>

        {user?.type === "Admin" && (
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">Admin Panel</h3>
            <p className="text-purple-600 text-sm">
              Full administrative access to manage users, settings, and all system
              features.
            </p>
          </div>
        )}

        {user?.type === "Employee" && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Employee Portal</h3>
            <p className="text-blue-600 text-sm">
              Access your assigned tasks, manage client interactions, and update
              records.
            </p>
          </div>
        )}

        {user?.type === "Client" && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Client Portal</h3>
            <p className="text-green-600 text-sm">
              View your account information, submit requests, and track your
              service status.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
