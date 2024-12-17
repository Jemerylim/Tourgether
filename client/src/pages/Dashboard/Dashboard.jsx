import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate(); // React Router hook to navigate

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <Navbar />

      {/* Trips Header */}
      <div className="trips-header">
        <h2 className="trips-title">Your Trips</h2>
        <button className="add-trip-btn" onClick={() => navigate("/create-trip")}>
          Add Trip
        </button>
      </div>

      {/* Trips Content */}
      <div className="trips-container">
        {/* Placeholder Cards */}
        <div className="trip-card">Selected Picture<br />Trip Name<br />Date range?</div>
        <div className="trip-card"></div>
        <div className="trip-card"></div>
        <div className="trip-card"></div>
        <div className="trip-card"></div>
      </div>
    </div>
  );
};

export default Dashboard;
