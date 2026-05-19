import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx';
import RegisterPage from '../../components/auth/RegisterPage.jsx';
import AuthThemeToggle from '../../components/auth/AuthThemeToggle.jsx';
const Register = () => {
  return (
    <>
    <div
      data-auth-screen
      className="auth-screen flex min-h-screen flex-col md:flex-row"
    >

    <RegisterPage order='1' order1='1' />
    <Welcome order='2' order1='2' text = 'Create Account' />
    
    </div>
    <AuthThemeToggle />
    
    </>
  )
}

export default Register
