import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate(); // React Router hook to programmatically navigate

  return (
    <div className="homepage-layout">
      {/* Navbar */}
      <Navbar />

      {/* Background shapes */}
      <div className="shape shape-left"></div>
      <div className="shape shape-right"></div>

      <div className="hometext-section">
        <h1>Welcome to Tourgether</h1>
        <p>Your ultimate collaborative travel planner. <br />
          Join forces with friends and family to create unforgettable journeys, customized itineraries, and shared memories. </p>
        <button onClick={() => navigate('/login')} style={{ marginTop: "20px" }}>
          Start your Journey!
        </button>
      </div>
    </div>

  );
};

export default Home;
