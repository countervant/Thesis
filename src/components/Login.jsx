import React from "react";

const Login = () => {
  return (
    <div className="flex mt-30 mx-auto mb-0 max-w-130 h-100 items-center p-5 flex-col">
      <h1 className="font-['Bruno_Ace_SC',sans-serif] text-[36px] ">Log in</h1>

      <div className="flex h-5 flex-col gap-10 mt-20">
        <input
          type="text"
          placeholder="Email"
          className="border-black border-b w-100 pb-2"
        />
        <input
          type="text"
          placeholder="Password"
          className="border-black border-b w-100 pb-2"
        />
      </div>

          <button className="w-full py-3 rounded-lg text-white font-medium text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg mt-8">
            Sign In
          </button>
          
          <div className="flex justify-between text-sm font-medium text-pink-500 mb-18">
            <a href="#" className="hover:text-pink-600">Create Account</a>
            <a href="#" className="hover:text-pink-600">Forgot Password?</a>
          </div>
        </div>
      </div>
    </div>

     </div>
   
    </div>
  );
};

export default Login;
