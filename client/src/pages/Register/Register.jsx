import React, { useState,useEffect} from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios"; // For API requests
import registerImage from "../../assets/Register.png"; // Replace with a registration-themed image
import Navbar from "../../components/Navbar/Navbar";
import "./Register.css"; // Import the external CSS

const Register = () => {
  const navigate = useNavigate();

  // State to hold user input
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState([]); // To store multiple error messages
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value, // Dynamically set the field
    });
  };

  const preloadImage = (src) => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsImageLoaded(true); 
  };

  useEffect(() => {
    preloadImage(registerImage);
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrors([]);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors(["Please enter a valid email address"]);
      return;
    }

    // Basic validation: Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }

    // Basic validation: Check password length
    if (formData.password.length < 8) {
      setErrors(["Password must be at least 8 characters long"]);
      return;
    }

    try {
      // Make a POST request to the backend API
      const response = await axios.post("http://44.211.206.111:5000/api/users/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      console.log("Registration successful:", response.data);

      navigate("/login", {
        state: { message: "Account created successfully! Please log in." },
      });
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);

      // Handle backend errors
      if (err.response?.data?.message) {
        setErrors([err.response.data.message]); // Single error message
      } else if (err.response?.data?.errors) {
        setErrors(err.response.data.errors); // Array of errors
      } else {
        setErrors(["An error occurred. Please try again."]);
      }
    }
  };

  return (
    <div className="register-container">
      {/* Navbar */}
      <Navbar />

      {/* Right Section: Image Placeholder */}
      <div className="image-placeholder-container">
                {/* Show a loader or placeholder until the image is loaded */}
                {isImageLoaded ? (
                    <img src={registerImage} alt="side image" className="side-image" />
                ) : (
                    <div className="image-placeholder">Loading...</div>
                )}
            </div>

      {/* Left Section: Form */}
      <div className="register-form-section">
        <h1 className="register-title">Tourgether</h1>
        <p className="register-description">Create your account to join Tourgether.</p>
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name" className="input-label">Name</label>
            <input
              type="text"
              id="name"
              placeholder="Full Name"
              className="register-input"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              className="register-input"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Password"
              className="register-input"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password" className="input-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm Password"
              className="register-input"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="register-button">Register</button>

          {/* Display error messages */}
          {errors.length > 0 && (
            <div className="error-messages">
              {errors.map((error, index) => (
                <p key={index} className="error-message">{error}</p>
              ))}
            </div>
          )}
        </form>
        <p className="register-text">
          Already have an account?{" "}
          <button className="register-link" onClick={() => navigate("/login")}>
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
