import LoginPage from "../../components/auth/LoginPage.jsx";
import Welcome from "../../components/auth/Welcome.jsx";
import AuthThemeToggle from "../../components/auth/AuthThemeToggle.jsx";
const Login = () => {


  return (
    <>
      <div data-auth-screen className="auth-screen flex min-h-screen flex-col md:flex-row dark:bg-[#111111]">
        <Welcome order='1' order1='1' text = 'Welcome to' />
        <LoginPage order='2' order1='2' />
      </div>
      <AuthThemeToggle />
    </>
  );
};

export default Login;
