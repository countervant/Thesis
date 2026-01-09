import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import React from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
const App = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route index element={<Login />} />
        <Route path="/register" element={<Register />} />
      </>
    )
  );

  return <RouterProvider router={router} />;
};

export default App;
