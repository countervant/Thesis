import LoginPage from "../../components/auth/LoginPage.jsx";
const Login = () => {


  return (
    <>
      <div data-auth-screen className="auth-screen flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#111111]">
        <LoginPage />
      </div>
    </>
  );
};

export default Login;
