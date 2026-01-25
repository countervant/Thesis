import React from 'react'
import Welcome from '../../components/Welcome.jsx'
import ForgotPasswordcom from '../../components/ForgotPasswordcom.jsx'
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