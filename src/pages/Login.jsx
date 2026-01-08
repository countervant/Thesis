import LoginPage from "../components/LoginPage";
import Welcome from "../components/Welcome";
const Login = () => {


  return (
    <div className="flex min-h-screen flex-col md:flex-row">
     
     <Welcome />
     
     <LoginPage />

      
    </div>
  );
};

export default Login;