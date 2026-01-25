import LoginPage from "../../components/LoginPage.jsx";
import Welcome from "../../components/Welcome.jsx";
const Login = () => {


  return (
    <div className="flex min-h-screen flex-col-reverse md:flex-row">
     
     <Welcome order='2' order1='1' text = 'Welcome to' />
     
     <LoginPage order='1' order1='2' />

      
    </div>
  );
};

export default Login;