import React, { useState } from "react";
import backgroundImage from "../assets/backround.png";
import logo from "../assets/CLIENTRA.png";
import view from "../assets/view.png";
import hide from "../assets/hide.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen">
      <div
        className="relative w-1/2 bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-[rgba(224,58,175,0.7)]" />
        <div className="relative z-10 h-full flex flex-col justify-center px-12 space-y-8">
          <div>
            <p className="text-2xl font- mb-2">Welcome to</p>
            <h1 className="text-5xl font-bold">Dream Light Visual</h1>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">Mission</h2>
              <p className="text-base leading-relaxed">
                To provide the best results of high-quality and most cost-effective
                videos, graphics and website services designed. To fulfill the needs
                of our clients and gratify their experience in terms of performance
                and outcome.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Vision</h2>
              <p className="text-base leading-relaxed">
                To be the most reliable and trustworthy marketing agency designed to
                accomplish the needs of small, medium, and large businesses worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-1/2 bg-gray-100 flex flex-col items-center justify-center px-12">
        <img src={logo} alt="CLIENTRA" className="w-45 h-45 object-contain" />
        <h2 className="text-3xl font-bold mb-10 tracking-wide uppercase" style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}>LOG IN</h2>

        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="border-b border-black mb-2">
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <div className="border-b border-black flex items-center mb-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-pink-500 hover:text-pink-600 focus:outline-none pb-2 pl-3"
              >
                {showPassword ? <img src={hide} alt="Hide" className="w-5 h-5" /> : <img src={view} alt="Show" className="w-5 h-5" />}
              </button>
            </div>
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
  );
};

export default Login;
