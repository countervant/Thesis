import React from 'react'
import RegisterPage from '../../components/auth/RegisterPage.jsx';
const Register = () => {
  return (
    <>
    <div
      data-auth-screen
      className="auth-screen flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#111111]"
    >
    <RegisterPage />
    
    </div>
    </>
  )
}

export default Register
