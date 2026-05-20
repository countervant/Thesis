import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx';
import RegisterPage from '../../components/auth/RegisterPage.jsx';
const Register = () => {
  return (
    <>
    <div
      data-auth-screen
      className="auth-screen flex min-h-screen flex-col bg-gray-100 md:flex-row-reverse"
    >

    <Welcome order='0' order1='0' text = 'Create Account' mobileAuthHero />
    <RegisterPage order='0' order1='0' />
    
    </div>
    </>
  )
}

export default Register
