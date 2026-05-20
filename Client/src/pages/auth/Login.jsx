import LoginPage from "../../components/auth/LoginPage.jsx";
import Welcome from "../../components/auth/Welcome.jsx";
const Login = () => {


  return (
    <>
      <div data-auth-screen className="auth-screen flex min-h-screen flex-col bg-gray-100 md:flex-row dark:bg-[#111111]">
        <Welcome order='1' order1='1' text = 'Welcome to' mobileAuthHero />
        <LoginPage order='2' order1='2' />
      </div>
    </>
  );
};

export default Login;
