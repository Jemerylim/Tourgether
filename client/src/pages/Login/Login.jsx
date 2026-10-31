import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios"; // Axios for API requests
import loginImage from "../../assets/Login.png";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";

// The backend's login messages ("User not found", "Invalid credentials") are terse;
// say what to do instead.
const loginErrorMessage = (error) => {
    const status = error.response?.status;
    if (status === 404) return "No account uses that email. Check it for typos, or register below.";
    if (status === 401) return "That password doesn't match this account. Try again, or reset it below.";
    return apiErrorMessage(error, "Sign in failed");
};

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State for login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

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

    // Handle Login
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(`${API_URL}/api/users/login`, {
                email,
                password,
            });

            const { token } = response.data;
            localStorage.setItem("authToken", token);
            localStorage.setItem("userEmail", email);

            const redirectUrl = new URLSearchParams(location.search).get("redirect");
            navigate(redirectUrl || "/dashboard");
        } catch (error) {
            setError(loginErrorMessage(error));
        }
    };

    // Handle Forgot Password Request
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetSuccessMessage("");
        setResetErrorMessage("");

        try {
            const response = await axios.post(`${API_URL}/api/users/forgot-password`, {
                email: forgotPasswordEmail,
            });

            setResetSuccessMessage(response.data.message || "A password reset link has been sent to your email.");
            setForgotPasswordEmail("");
        } catch (error) {
            setResetErrorMessage(apiErrorMessage(error, "Couldn't send the reset link"));
        }
    };

    return (
        <AuthLayout
            image={loginImage}
            imageAlt="Two travellers with a suitcase"
            caption="Your group is waiting on the itinerary."
            footer={
            <div className="flex flex-col items-center gap-2 text-sm">
                <button
                    type="button"
                    className="bg-transparent p-0 font-bold text-ink underline underline-offset-2 hover:text-plum border-0"
                    onClick={() => setShowForgotPasswordModal(true)}
                >
                    Forgot password?
                </button>
                <p className="text-ink-soft">
                    Don't have an account?{" "}
                    <button
                        type="button"
                        className="bg-transparent p-0 font-bold text-plum underline underline-offset-2 hover:text-ink border-0"
                        onClick={() => navigate("/register")}
                    >
                        Register here
                    </button>
                </p>
            </div>
            }
        >
            <h1 className="font-display text-4xl text-ink">Welcome back</h1>
            <p className="mt-2 text-ink-soft">Please fill in the fields to access your account.</p>

            {successMessage && (
                <p role="status" className="mt-5 rounded-xl bg-lagoon-light px-4 py-3 text-sm font-bold text-ink">
                    {successMessage}
                </p>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="email" className="field-label">Email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="field-label">Password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        className="field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn-primary w-full py-3 text-base">Sign in</button>
                {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
            </form>

            {/* Forgot Password Modal */}
            {showForgotPasswordModal && (
                <div
                    className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink-deep/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reset-title"
                >
                    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-soft">
                        <h2 id="reset-title" className="font-display text-2xl text-ink">Reset password</h2>
                        <p className="mt-1 text-sm text-ink-soft">Enter your email to receive a password reset link.</p>

                        <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
                            <input
                                type="email"
                                placeholder="you@example.com"
                                aria-label="Email"
                                className="field"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-dark w-full py-3 text-base">Send reset link</button>
                        </form>

                        {resetSuccessMessage && (
                            <p role="status" className="mt-4 rounded-xl bg-lagoon-light px-4 py-3 text-sm font-bold text-ink">
                                {resetSuccessMessage}
                            </p>
                        )}
                        {resetErrorMessage && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{resetErrorMessage}</p>}

                        <button
                            type="button"
                            className="btn-ghost mt-4 w-full"
                            onClick={() => setShowForgotPasswordModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </AuthLayout>
    );
};

export default Login;
