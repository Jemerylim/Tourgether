import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import CreateTrip from "./pages/Trips/NewTripForm"
import TripDetails from "./pages/Trips/trip"
import Dashboard from "./pages/Dashboard/Dashboard";
import MyTrips from "./pages/Trips/MyTrips";
import AcceptInvitation from "./pages/Trips/AcceptInvitation";
import Quiz from "./pages/Quiz/Quiz";
import { Result } from "./pages/Quiz/Quiz";
import AllEvents from "./pages/Trips/AllEvents";

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-trip" element={<CreateTrip />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/trip/:tripId/accept" element={<AcceptInvitation />} />
        <Route path="/trip/:id/events" element={<AllEvents />} />
    </Routes>
);

export default AppRoutes;
