import React from 'react'
import ForgotPasswordkey from '../assets/ForgotPassword-key.png'
import AuthenticationHelper from './AuthenticationHelper'
const ForgotPasswordcom = () => {
  return (
    <>
       <div className='w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0'>
       <img src={ForgotPasswordkey} alt="Forgot Password Key" className='w-32 h-32'/>
        <h1 
        className='text-2xl sm:text-3xl font-bold tracking-wide uppercase mt-10
        ' style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}  >
            Forgot Password?</h1>
            <h2>Enter Your Gmail so we can reset your password</h2>
        <div className="border-b border-black mb-2 mt-10 w-110">
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              />
            </div>
        
        <button className='w-100 py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600
           hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8'>Send Verification Code</button>
    
        <div className="w-100 max-w-sm sm:max-w-md space-y-6 sm:space-y-8 mt-5">
        <AuthenticationHelper 
        link="/"
        Label="Back to Login"
        Label1="Resend Code"
        />
      
        </div>
       </div>
    </>
  )
}

export default ForgotPasswordcom