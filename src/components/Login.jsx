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

      <div className="bt mt-30 flex items-stretch w-100 rounded-full h-14 justify-center  border-black border bg-[linear-gradient(60deg,rgba(224,77,175,1)_0%,rgba(176,16,186,1)_100%)]">
        <button className="text-black px-4 py-2 ">Sign in</button>
      </div>
    </div>
  );
};

export default Login;
