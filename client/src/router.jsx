import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import CreateTrip from "./pages/Trips/NewTripForm"
import TripDetails from "./pages/Trips/Trip"
import Dashboard from "./pages/Dashboard/Dashboard";
import MyTrips from "./pages/Trips/MyTrips";
import AcceptInvitation from "./pages/Trips/AcceptInvitation";
import JoinTrip from "./pages/Trips/JoinTrip";
import Quiz from "./pages/Quiz/Quiz";
import { Result } from "./pages/Quiz/Quiz";
import AllEvents from "./pages/Trips/AllEvents";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Profile from "./pages/Profile/Profile";
import NotFound from "./pages/NotFound/NotFound";

// Landing and auth pages are for signed-out visitors; send signed-in ones on to where
// they were heading (?redirect=) or their dashboard. An expired token is cleared by the
// dashboard's 401 handling, which sends them back to /login.
const GuestOnly = ({ children }) => {
    const location = useLocation();
    if (!localStorage.getItem("authToken")) return children;
    const redirect = new URLSearchParams(location.search).get("redirect");
    const safe = redirect?.startsWith("/") && !redirect.startsWith("//");
    return <Navigate to={safe ? redirect : "/dashboard"} replace />;
};

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<GuestOnly><Home /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-trip" element={<CreateTrip />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/trip/:tripId/accept" element={<AcceptInvitation />} />
        <Route path="/join/:token" element={<JoinTrip />} />
        <Route path="/trip/:id/events" element={<AllEvents />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
    </Routes>
);

export default AppRoutes;
