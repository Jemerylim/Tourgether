import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import registerImage from "../../assets/Register.png";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";

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
            const response = await axios.post(`${API_URL}/api/users/reset-password`, {
                email,
                token,
                newPassword,
            });
    
            setSuccessMessage(response.data.message);
            setError(""); // Clear any previous errors
    
            // Redirect to login after 3 seconds
            setTimeout(() => navigate("/login", { replace: true }), 3000);
        } catch (error) {
            // Display error from backend response
            if (error.response?.data?.errors) {
                setError(error.response.data.errors.join(", ")); // Show validation errors
            } else {
                setError(error.response?.data?.message || apiErrorMessage(error, "Couldn't reset your password"));
            }
        }
    };
    

    return (
        <AuthLayout
            image={registerImage}
            imageAlt="Travellers ready to explore"
            caption="Pick a new password."
            imageSide="left"
            footer={
                <p className="text-center text-sm text-ink-soft">
                    Remembered it?{" "}
                    <Link to="/login" className="font-extrabold text-plum underline hover:text-ink">
                        Back to log in
                    </Link>
                </p>
            }
        >
            <h1 className="font-display text-4xl text-ink">Reset password</h1>
            <p className="mt-2 text-ink-soft">Enter your new password below.</p>

            {successMessage && (
                <p role="status" className="mt-5 rounded-xl bg-lagoon-light px-4 py-3 text-sm font-bold text-ink">
                    {successMessage} Taking you to log in...
                </p>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
                <div>
                    <label htmlFor="new-password" className="field-label">New password</label>
                    <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className="field"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="confirm-password" className="field-label">Confirm password</label>
                    <input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                        className="field"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn-primary w-full py-3 text-base">Save new password</button>
                {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
