import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Unauthorized = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").trim();
  const dashboardPathByRole = {
    client: "/client/dashboard",
    employee: "/employee/dashboard",
    admin: "/admin/dashboard",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, you don't have permission to access this page.
          <span className="block mt-2">
            Your current role: <strong>{role || "Unknown"}</strong>
          </span>
        </p>
        <Link
          to={dashboardPathByRole[role.toLowerCase()] || "/dashboard"}
          className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
