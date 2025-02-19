import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios"; // Axios for API requests
import loginImage from "../../assets/Login.png";
import Navbar from "../../components/Navbar/Navbar";
import "./Login.css";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State for login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // State for Forgot Password Modal
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [resetSuccessMessage, setResetSuccessMessage] = useState("");
    const [resetErrorMessage, setResetErrorMessage] = useState("");

    useEffect(() => {
        if (location.state && location.state.message) {
            setSuccessMessage(location.state.message);
        }
    }, [location.state]);

    const preloadImage = (src) => {
        const img = new Image();
        img.src = src;
        img.onload = () => setIsImageLoaded(true); 
    };

    useEffect(() => {
        preloadImage(loginImage);
    }, []);

    // Handle Login
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post("http://52.44.156.98:5000/api/users/login", {
                email,
                password,
            });

            const { token } = response.data;
            localStorage.setItem("authToken", token);
            localStorage.setItem("userEmail", email);

            const redirectUrl = new URLSearchParams(location.search).get("redirect");
            navigate(redirectUrl || "/dashboard");
        } catch (error) {
            setError(error.response?.data?.message || "An error occurred. Please try again.");
        }
    };

    // Handle Forgot Password Request
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetSuccessMessage("");
        setResetErrorMessage("");

        try {
            const response = await axios.post("http://52.44.156.98:5000/api/users/forgot-password", {
                email: forgotPasswordEmail,
            });

            setResetSuccessMessage(response.data.message || "A password reset link has been sent to your email.");
            setForgotPasswordEmail("");
        } catch (error) {
            setResetErrorMessage(error.response?.data?.message || "Failed to send reset link. Try again.");
        }
    };

    return (
        <div className="login-container">
            {/* Navbar */}
            <Navbar />

            {/* Left Section: Form */}
            <div className="login-form-section">
                <h1 className="login-title">Tourgether</h1>
                <p className="login-description">Please fill in the fields to access your account.</p>

                {/* Display success message */}
                {successMessage && <div className="success-message"><p>{successMessage}</p></div>}

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email</label>
                        <input
                            type="email"
                            placeholder="Email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input
                            type="password"
                            placeholder="Password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="login-button">Sign In</button>
                    {error && <p className="error-message">{error}</p>}
                </form>

                <div className="forgot-password">
                    <button className="forgot-password-link" onClick={() => setShowForgotPasswordModal(true)}>
                        Forgot Password?
                    </button>
                </div>

                <p className="register-text">
                    Don't have an account?{" "}
                    <button className="register-link" onClick={() => navigate("/register")}>
                        Register here
                    </button>
                </p>
            </div>

            {/* Right Section: Image */}
            <div className="image-placeholder-container">
                {isImageLoaded ? (
                    <img src={loginImage} alt="side image" className="side-image" />
                ) : (
                    <div className="image-placeholder">Loading...</div>
                )}
            </div>

            {/* Forgot Password Modal */}
            {showForgotPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Reset Password</h2>
                        <p>Enter your email to receive a password reset link.</p>

                        <form onSubmit={handleForgotPassword}>
                            <input
                                type="email"
                                placeholder="Email"
                                className="modal-input"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="modal-button">Send Reset Link</button>
                        </form>

                        {resetSuccessMessage && <p className="success-message">{resetSuccessMessage}</p>}
                        {resetErrorMessage && <p className="error-message">{resetErrorMessage}</p>}

                        <button className="close-modal" onClick={() => setShowForgotPasswordModal(false)}>Close</button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Login;
