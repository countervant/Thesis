import React from 'react'
import {Link} from 'react-router-dom';
const AuthenticationHelper = ({link, Label, Label1}) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 text-sm font-medium text-pink-500">
            <Link to = {link} className="hover:text-pink-600">{Label}</Link>
            <p href="#" className="hover:text-pink-600">{Label1}</p>
          </div>
    </>
  )
}

export default AuthenticationHelper