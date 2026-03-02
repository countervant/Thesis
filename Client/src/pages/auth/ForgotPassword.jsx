import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx'
import ForgotPasswordcom from '../../components/auth/ForgotPasswordcom.jsx'

const ForgotPassword = () => {
  return (
    <div className="flex min-h-screen md:flex-row">
      <div className="hidden md:block md:w-1/2">
        <Welcome text="Forgot Password" />
      </div>
      <ForgotPasswordcom />
    </div>
  )
}

export default ForgotPassword