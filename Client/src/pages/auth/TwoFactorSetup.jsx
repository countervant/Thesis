import { ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TwoFactorSettings from "../../components/auth/TwoFactorSettings.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const TwoFactorSetup = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  return <main className="flex min-h-screen items-center justify-center bg-[#f8f9fd] px-4 py-10 dark:bg-[#111]">
    <div className="w-full max-w-2xl">
      <header className="mb-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/60"><ShieldCheck className="h-8 w-8" /></span>
        <h1 className="mt-5 text-3xl font-black text-[#10142d] dark:text-white">Secure Your Admin Account</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">CLIENTRA requires two-factor authentication for administrators. Complete this setup before continuing to the dashboard.</p>
      </header>
      <TwoFactorSettings setupMode onEnabled={() => { updateUser({ twoFactorEnabled: true, twoFactorSetupRequired: false }); navigate("/admin/dashboard", { replace: true }); }} />
    </div>
  </main>;
};

export default TwoFactorSetup;
