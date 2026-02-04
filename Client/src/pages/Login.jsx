import LoginPage from "../components/LoginPage";
import Welcome from "../components/Welcome";
const Login = () => {


  return (
    <div className="flex min-h-screen flex-col md:flex-row">
     
     <Welcome order='2' order1='1' text = 'Welcome to' />
     
     <LoginPage order='1' order1='2' />

      
    </div>
  );
};

export default Login;