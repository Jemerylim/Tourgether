import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // For API requests
import registerImage from "../../assets/Register.png";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";

const fields = [
  { id: "name", label: "Name", type: "text", placeholder: "Full name", autoComplete: "name" },
  { id: "email", label: "Email", type: "email", placeholder: "you@example.com", autoComplete: "email" },
  { id: "password", label: "Password", type: "password", placeholder: "At least 8 characters", autoComplete: "new-password" },
  { id: "confirmPassword", label: "Confirm password", type: "password", placeholder: "Repeat your password", autoComplete: "new-password" },
];

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

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value, // Dynamically set the field
    });
  };

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
      const response = await axios.post(`${API_URL}/api/users/register`, {
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
        setErrors([apiErrorMessage(err, "Couldn't create your account")]);
      }
    }
  };

  return (
    <AuthLayout
      image={registerImage}
      imageAlt="Travellers ready to explore"
      caption="Start with a trip. Add people after."
      imageSide="left"
      footer={
      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <button
          type="button"
          className="bg-transparent p-0 font-bold text-plum underline underline-offset-2 hover:text-ink border-0"
          onClick={() => navigate("/login")}
        >
          Log in here
        </button>
      </p>
      }
    >
      <h1 className="font-display text-4xl text-ink">Join Tourgether</h1>
      <p className="mt-2 text-ink-soft">Create your account to start planning trips together.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {fields.map(({ id, label, ...input }) => (
          <div key={id}>
            <label htmlFor={id} className="field-label">{label}</label>
            <input
              id={id}
              className="field"
              value={formData[id]}
              onChange={handleChange}
              {...input}
            />
          </div>
        ))}

        <button type="submit" className="btn-primary w-full py-3 text-base">Create account</button>

        {/* Display error messages */}
        {errors.length > 0 && (
          <div role="alert" className="space-y-1">
            {errors.map((error, index) => (
              <p key={index} className="text-sm font-bold text-red-700">{error}</p>
            ))}
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default Register;
