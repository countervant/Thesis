import React from 'react'
import Welcome from '../components/Welcome.jsx';
import LoginPage from '../components/LoginPage.jsx';
import RegisterPage from '../components/RegisterPage.jsx';
const Register = () => {
  return (
    <>
    <div className="flex min-h-screen flex-col md:flex-row-reverse">

    <Welcome order='2' order1='1' text = 'Create Account'/>
    <RegisterPage order='1' order1='2' />
    
    </div>

    
    </>
  )
}

export default Register