import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/Tourgether-Logo.png";

const Navbar = () => {
    const navigate = useNavigate(); // React Router hook to programmatically navigate

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <h1>
                    <img onClick={() => navigate('/')} src={logo} alt="Logo" className="logo" />
                </h1>
            </div>
            <div className="navbar-buttons">
                <button onClick={() => navigate('/login')} className="btn login">Login</button>
                <button onClick={() => navigate('/register')} className="btn signup">Sign Up</button>
            </div>
        </nav>
    );
};

export default Navbar;