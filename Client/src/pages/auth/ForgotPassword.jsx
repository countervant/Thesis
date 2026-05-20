import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx'
import ForgotPasswordcom from '../../components/auth/ForgotPasswordcom.jsx'
const ForgotPassword = () => {
  
  return (
   <>
   <div data-auth-screen className="auth-screen flex min-h-screen flex-col bg-gray-100 md:flex-row dark:bg-[#111111]">
   <Welcome order="1" order1="1" text="Reset Password" />
   <ForgotPasswordcom />
    </div>
   </>
  )
}

export default ForgotPassword
