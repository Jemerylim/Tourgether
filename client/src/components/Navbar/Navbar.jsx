import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/Tourgether-Logo.png";

const Navbar = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if the user is logged in by checking the presence of authToken in localStorage
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token); // Set to true if token exists
    }, []);

    const handleLogout = () => {
        // Remove the token from localStorage to log out the user
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail'); // Optional: Clear other user-related data
        setIsLoggedIn(false);
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <h1>
                {isLoggedIn ? (
                    <>
                    <img onClick={() => navigate('/dashboard')} src={logo} alt="Logo" className="logo" />
                    </>
                ) : (
                    <>
                    <img onClick={() => navigate('/')} src={logo} alt="Logo" className="logo" />
                    </>
                    )}
                </h1>
            </div>
            <div className="navbar-buttons">
                {isLoggedIn ? (
                    <>
                        <button onClick={() => navigate('/my-trips')} className="btn profile">My Trips</button>
                        <button onClick={() => navigate('/profile')} className="btn profile">Profile</button>
                        <button onClick={handleLogout} className="btn logout">Sign Out</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => navigate('/login')} className="btn login">Login</button>
                        <button onClick={() => navigate('/register')} className="btn signup">Sign Up</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
