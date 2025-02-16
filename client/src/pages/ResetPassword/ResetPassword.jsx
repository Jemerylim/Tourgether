import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import "./ResetPassword.css";

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract token and email from URL
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    // State for new password
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Handle password reset submission
    const handleResetPassword = async (e) => {
        e.preventDefault();
    
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
    
        try {
            const response = await axios.post("http://localhost:5000/api/users/reset-password", {
                email,
                token,
                newPassword,
            });
    
            setSuccessMessage(response.data.message);
            setError(""); // Clear any previous errors
    
            // Redirect to login after 3 seconds
            setTimeout(() => navigate("/login"), 3000);
        } catch (error) {
            // Display error from backend response
            if (error.response?.data?.errors) {
                setError(error.response.data.errors.join(", ")); // Show validation errors
            } else {
                setError(error.response?.data?.message || "Failed to reset password. Try again.");
            }
        }
    };
    

    return (
        <div className="reset-password-container">
            <Navbar />
            <div className="reset-password-box">
                <h2>Reset Password</h2>
                <p>Enter your new password below.</p>

                {successMessage && <p className="success-message">{successMessage}</p>}
                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleResetPassword}>
                    <div className="input-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            className="reset-password-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            className="reset-password-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="reset-password-button">Reset</button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
