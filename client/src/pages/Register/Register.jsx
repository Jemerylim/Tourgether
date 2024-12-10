import React from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/Tourgether-Logo.png";
import registerImage from "../../assets/Register.png"; // Replace with a registration-themed image
import "./Register.css"; // Import the external CSS

const Register = () => {
    const navigate = useNavigate();

    const goToLogin = () => {
        navigate("/login");
    };

    return (
        <div className="register-container">
            {/* Right Section: Image Placeholder */}
            <div className="image-placeholder-container">
                <img src={registerImage} alt="side image" className="side-image" />
            </div>

            {/* Logo */}
            <div className="logo-container">
                <Link to="/"> {/* Link to the home page */}
                    <img src={logo} alt="Logo" className="logo" />
                </Link>
            </div>

            {/* Left Section: Form */}
            <div className="register-form-section">
                <h1 className="register-title">Tourgether</h1>
                <p className="register-description">Create your account to join Tourgether.</p>
                <form className="register-form">
                    <div className="input-group">
                        <label htmlFor="name" className="input-label">Name</label>
                        <input type="text" id="name" placeholder="Full Name" className="register-input" />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email</label>
                        <input type="email" id="email" placeholder="Email" className="register-input" />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input type="password" id="password" placeholder="Password" className="register-input" />
                    </div>
                    <div className="input-group">
                        <label htmlFor="confirm-password" className="input-label">Confirm Password</label>
                        <input
                            type="password"
                            id="confirm-password"
                            placeholder="Confirm Password"
                            className="register-input"
                        />
                    </div>
                    <button type="submit" className="register-button">Register</button>
                </form>
                <p className="register-text">
                    Already have an account?{" "}
                    <button className="register-link" onClick={goToLogin}>
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Register;
