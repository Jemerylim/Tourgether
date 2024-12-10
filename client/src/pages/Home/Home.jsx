import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate(); // React Router hook to programmatically navigate

  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <p>This is the landing page of the application.</p>
      <button onClick={() => navigate('/login')} style={{ marginTop: "20px" }}>
        Go to Login
      </button>
    </div>
  );
};

export default Home;
