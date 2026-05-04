import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-linear-to-r from-pink-500 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CLIENTRA</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Welcome, <strong>{user?.email}</strong>
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
              {user?.type}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            You are logged in as <strong>{user?.type}</strong>
          </p>

          {/* Role-specific content */}
          {user?.type === "Admin" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-800 mb-2">
                Admin Panel
              </h3>
              <p className="text-purple-600 text-sm">
                You have full administrative access to manage users, settings,
                and all system features.
              </p>
            </div>
          )}

          {user?.type === "Employee" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Employee Portal
              </h3>
              <p className="text-blue-600 text-sm">
                Access your assigned tasks, manage client interactions, and
                update records.
              </p>
            </div>
          )}

          {user?.type === "Client" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">
                Client Portal
              </h3>
              <p className="text-green-600 text-sm">
                View your account information, submit requests, and track your
                service status.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
