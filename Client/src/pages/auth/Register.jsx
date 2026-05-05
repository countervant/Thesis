import React from 'react'
import Welcome from '../../components/auth/Welcome.jsx';
import RegisterPage from '../../components/auth/RegisterPage.jsx';
const Register = () => {
  return (
    <>
    <div
      data-auth-screen
      className="auth-screen flex min-h-screen flex-col md:flex-row-reverse"
    >

    <Welcome order='2' order1='1' text = 'Create Account'/>
    <RegisterPage order='1' order1='2' />
    
    </div>
    
    </>
  )
}

export default Register
