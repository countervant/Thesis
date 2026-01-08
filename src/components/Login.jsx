import React, { useState } from "react";
import backgroundImage from "../assets/backround.png";
import logo from "../assets/CLIENTRA.png";
import view from "../assets/view.png";
import hide from "../assets/hide.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div
        className="relative order-2 md:order-1 w-full md:w-1/2 min-h-[40vh] md:min-h-screen bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-[rgba(224,58,175,0.7)]" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 md:px-12 py-10 md:py-0 space-y-6 sm:space-y-8">
          <div>
            <p className="text-xl sm:text-2xl font-medium mb-2">Welcome to</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Dream Light Visual</h1>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Mission</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                To provide the best results of high-quality and most cost-effective
                videos, graphics and website services designed. To fulfill the needs
                of our clients and gratify their experience in terms of performance
                and outcome.
              </p>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Vision</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                To be the most reliable and trustworthy marketing agency designed to
                accomplish the needs of small, medium, and large businesses worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="order-1 md:order-2 w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0">
        <img src={logo} alt="CLIENTRA" className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain" />
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10 tracking-wide uppercase" style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}>LOG IN</h2>

        <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
          <div>
            <div className="border-b border-black mb-2">
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="border-b-2 border-gray-400 flex items-center">
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

          <button className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8">
            Sign In
          </button>
          
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 text-sm font-medium text-pink-500">
            <a href="#" className="hover:text-pink-600">Create Account</a>
            <a href="#" className="hover:text-pink-600">Forgot Password?</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;