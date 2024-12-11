import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios"; // Axios for API requests
import loginImage from "../../assets/Login.png";
import Navbar from "../../components/Navbar/Navbar";
import "./Login.css";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State for email, password, error messages, and success messages
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Check if there's a success message in the state
    useEffect(() => {
        if (location.state && location.state.message) {
            setSuccessMessage(location.state.message);
        }
    }, [location.state]);

    // Handle form submission
    const handleLogin = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior

        try {
            // Send login request to the backend
            const response = await axios.post("http://localhost:5000/api/users/login", {
                email,
                password,
            });

            // Extract the token from the response
            const { token } = response.data;

            // Store the token securely
            localStorage.setItem("authToken", token);

            // Navigate to the dashboard or protected page
            navigate("/dashboard");
        } catch (error) {
            // Handle errors and show an error message
            setError(error.response?.data?.message || "An error occurred. Please try again.");
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
                {successMessage && (
                    <div className="success-message">
                        <p>{successMessage}</p>
                    </div>
                )}

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email</label>
                        <input
                            type="email"
                            placeholder="Email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} // Update state
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input
                            type="password"
                            placeholder="Password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} // Update state
                        />
                    </div>
                    <button type="submit" className="login-button">Sign In</button>
                    {/* Display error message */}
                    {error && <p className="error-message">{error}</p>}
                </form>
                <div className="forgot-password">
                    <a href="#">Forgot Password?</a>
                </div>
                <p className="register-text">
                    Don't have an account?{" "}
                    <button className="register-link" onClick={() => navigate("/register")}>
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
