import React from "react";
import logo from "../assets/logo.png";
const SideBar = () => {
  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r-2 border-gray-300 ">
       <div className='flex w-64 h-26 border-b-2 border-gray-300 flex-col'>
        <div className='relative'>
           <img src={logo} alt="Logo" className='w-22 h-22'/>
           </div>
           <div className='absolute ml-19'>
            <h1 className='mt-6 text-2xl z-2' style={{fontFamily: 'Bruno Ace SC, sans-serif'}}>Clientra</h1>
            </div>
            <div className='absolute mt-16 ml-7 text-sm'>
              <h2>Business Management</h2>
            </div>
      </div>

        <div className="flex-1 p-4">
           <div className="flex w-50 flex-col justify-center items-center gap-5">
            <div className="flex justify-center border border-amber-400 w-40 h-10">Dashboard</div>
            <div>asjab</div>
           </div>

        </div>
      </aside>

      
    </>
  );
};

export default SideBar;