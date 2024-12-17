import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate(); // React Router hook to programmatically navigate

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="trips-header">
        <h2 className="trips-title">Your Trips</h2>
        <button className="add-trip-btn">Add Trip</button>
      </div>
    </div>
  );
};

export default Dashboard;
