import React from "react";
import { useNavigate, Link  } from "react-router-dom";
import logo from "../../assets/Tourgether-Logo.png";
import loginImage from "../../assets/Login.png";
import "./Login.css"; // Import the external CSS

const Login = () => {
    const navigate = useNavigate();

    const goToRegister = () => {
        navigate("/register");
    };

    return (
        <div className="login-container">
            {/* Logo */}
            <div className="logo-container">
                <Link to="/"> 
                    <img src={logo} alt="Logo" className="logo" />
                </Link>
            </div>

            {/* Left Section: Form */}
            <div className="login-form-section">
                <h1 className="login-title">Tourgether</h1>
                <p className="login-description">Please fill in the fields to access your account.</p>
                <form className="login-form">
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email</label>
                        <input type="email" placeholder="Email" className="login-input" />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input type="password" placeholder="Password" className="login-input" />
                    </div>
                    <button type="submit" className="login-button">Sign In</button>
                </form>
                <div className="forgot-password">
                    <a href="#">Forgot Password?</a>
                </div>
                {/* <div className="google-login-container">
                    <button className="google-login-button">Sign in with Google</button>
                </div> */}
                <p className="register-text">
                    Don't have an account?{" "}
                    <button className="register-link" onClick={goToRegister}>
                        Register here
                    </button>
                </p>
            </div>

            {/* Right Section: Image Placeholder */}
            <div className="image-placeholder-container">
                <img src={loginImage} alt="side image" className="side-image" />
            </div>
        </div>
    );
};

export default Login;
