import LoginPage from "../../components/auth/LoginPage.jsx";
import Welcome from "../../components/auth/Welcome.jsx";
const Login = () => {


  return (
    <div className="flex min-h-screen flex-col md:flex-row">
     
     <Welcome order='2' order1='1' text = 'Welcome to' />
     
     <LoginPage order='1' order1='2' />

      
    </div>
  );
};

export default Login;