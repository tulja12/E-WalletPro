import React from "react";
import { Link } from "react-router-dom";

function Success() {
  return (
    <div className="container text-center mt-5">

      <h1 className="text-success">Login Successful</h1>

      <p>Welcome to your account</p>

      <Link to="/dashboard" className="btn btn-primary mt-3">
        Go to Dashboard
      </Link>

    </div>
  );
}

export default Success;
