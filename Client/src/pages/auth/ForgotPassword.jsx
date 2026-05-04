import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx'
import ForgotPasswordcom from '../../components/auth/ForgotPasswordcom.jsx'
const ForgotPassword = () => {
  
  return (
   <>
   <div className="flex min-h-screen flex-col-reverse md:flex-row">
   <Welcome />
   <ForgotPasswordcom />
    </div>
   </>
  )
}

export default ForgotPassword