import React from "react";
import Logo from "../Assets/Logo.png";

const Login = () => {
  
  return (
    <div className="grid grid-cols-2" >

<div> 
  <img src="" alt="Logo" />

</div>

     <div>
      
       <div className=" flex mt-10 mx-auto mb-0 max-w-130 h-100 items-center p-5 flex-col mr-30">
        <img src={Logo} alt="" className="h-30" />
      <h1 className="font-['Bruno_Ace_SC',sans-serif] text-[36px] ">Log in</h1>

      <div className="flex h-5 flex-col gap-10 mt-15">
        <input
          type="email"
          placeholder="Email"
          className="border-black border-b w-100 pb-2 outline-none focus:border-[#df4baf]"
        />
        <input
          type="password"
          placeholder="Password"
          className="border-black border-b w-100 pb-2 outline-none focus:border-[#df4baf]"
        />
      </div>

      <div className="bt mt-30 flex items-stretch w-100 rounded-full h-14 justify-center  border-black border bg-[linear-gradient(60deg,rgba(224,77,175,1)_0%,rgba(176,16,186,1)_100%)]">
        <button className="text-black px-4 py-2 ">Sign in</button>
      </div>
     <p className="text-[#9D9D9D] mt-2 text-[14px]">Forgot Password</p>
    </div>

     </div>
   
    </div>
  );
};

export default Login;
