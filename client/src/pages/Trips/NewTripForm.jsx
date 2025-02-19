import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./NewTripForm.css";

const CreateTrip = () => {
    const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupEmails, setGroupEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");
  const [pickThroughVote, setPickThroughVote] = useState(false); // State for checkbox

  // Function to validate email using the API
  const validateEmail = async (email) => {
    try {
      const response = await axios.get(`http://52.44.156.98:5000/api/users/check-email`, {
        params: { email },
      });
      return response.data.registered; // Assuming the API returns { registered: true/false }
    } catch (error) {
      console.error("Error validating email:", error.response?.data?.message || error.message);
      setError(error.response?.data?.message || "Invalid email");
      return false;
    }
  };

  const handleAddEmail = async () => {
    if (!emailInput) {
      setError("Email cannot be empty.");
      return;
    }

    if (groupEmails.length >= 10) {
      setError("You can only add up to 10 emails.");
      return;
    }
    const loggedInEmail = localStorage.getItem("userEmail"); // Retrieve the current user's email from localStorage

    if (emailInput === loggedInEmail) {
        setError("You cannot add your own email to the group.");
        return;
    }

    setError(""); // Clear any previous error

    const isRegistered = await validateEmail(emailInput);

    if (isRegistered) {
      if (!groupEmails.includes(emailInput)) {
        setGroupEmails([...groupEmails, emailInput]);
        setEmailInput("");
      } else {
        setError("This email has already been added.");
      }
    } else {
      setError("This email is not registered.");
    }
  };

  const handleRemoveEmail = (email) => {
    setGroupEmails(groupEmails.filter((e) => e !== email));
  };

  const handleSubmit = async () => {
    const today = new Date().setHours(0, 0, 0, 0); // Get today's date at midnight
    if (!pickThroughVote) {
        // Validate startDate and endDate
        if (!startDate) {
            setError("Start date cannot be blank.");
            return;
        }
        if (new Date(startDate) < today) {
            setError("Start date cannot be before today.");
            return;
        }

        if (!endDate) {
            setError("End date cannot be blank.");
            return;
        }
        if (new Date(endDate) < today) {
            setError("End date cannot be before today.");
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            setError("End date cannot be earlier than start date.");
            return;
        }
    }
  
    if (groupEmails.length === 0) {
      setError("Please add at least one email to the group.");
      return;
    }
  
    const authToken = localStorage.getItem("authToken"); // Retrieve the token from localStorage or wherever it's stored
  
    if (!authToken) {
      setError("Authorization token is missing. Please log in again.");
      return;
    }
  
    setError(""); // Clear previous errors
  
    try {
      // Map emails to user IDs
      const response = await axios.post(
        "http://52.44.156.98:5000/api/users/get-ids-by-emails",
        {
          emails: groupEmails,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`, // Include the token in the headers
          },
        }
      );
  
      const { userIds } = response.data; // Expecting { userIds: [...] }
  
      const tripDetails = {
        name: groupName,
        members: userIds,
        description:"",
        startDate: pickThroughVote ? "" : startDate, // Send empty string if 'Pick through vote' is selected
        endDate: pickThroughVote ? "" : endDate, // Send empty string if 'Pick through vote' is selected
      };
  
      // Call to create trip
      const tripResponse = await axios.post(
        `http://52.44.156.98:5000/api/trips/create-trip`,
        tripDetails,
        {
          headers: {
            Authorization: `Bearer ${authToken}`, // Include the token in the headers
          },
        }
      );
      const id = tripResponse.data.data._id;
      console.log(id)
        // Redirect to the trip details page
        navigate(`/trip/${id}`);
  
    } catch (error) {
      console.error(
        "Error creating trip:",
        error.response?.data?.message || error.message
      );
      setError(
        error.response?.data?.message || "Server error. Please try again later."
      );
    }
  };
  

  return (
    <div className="newtripcontainer">
  <Navbar />
  <h1 className="heading">Create a new trip</h1>
  <div className="card">
    {/* Group Name */}
    <div className="group-name-container">
      <label className="label" htmlFor="groupName">
        Group Name
      </label>
      <input
        id="groupName"
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="input-group-name"
        placeholder="Group Name"
      />
    </div>

{/* Date Picker */}
<div className="date-container">
  <label className="label" htmlFor="dates">
    Date
  </label>
  <div className="flex-container">
    <input
      id="startDate"
      type="date"
      value={startDate}
      onChange={(e) => {
        setStartDate(e.target.value);
        if (endDate && new Date(e.target.value) > new Date(endDate)) {
          setEndDate(""); // Reset endDate if it's before the startDate
        }
      }}
      disabled={pickThroughVote}
      className="input-date"
    />
    <span>—</span>
    <input
      id="endDate"
      type="date"
      value={endDate}
      onChange={(e) => {
        const newEndDate = e.target.value;
        if (new Date(newEndDate) < new Date(startDate)) {
          setError("End date cannot be earlier than start date."); // Set error message
        } else {
          setError(""); // Clear error if valid
          setEndDate(newEndDate); // Update endDate
        }
      }}
      disabled={pickThroughVote}
      min={startDate} // Ensure endDate is not earlier than startDate
      className="input-date"
    />
  </div>
</div>



    {/* for future date voting
    Checkbox for "Pick through vote" 
    <div className="checkbox-container">
      <input
        id="pickThroughVote"
        type="checkbox"
        checked={pickThroughVote}
        onChange={(e) => setPickThroughVote(e.target.checked)}
        className="checkbox"
      />
      <label htmlFor="pickThroughVote" className="checkbox-label">
        Pick through vote
      </label>
    </div>
    */}
    {/* Email Input */}
    <div className="mb-4">
      <label className="label" htmlFor="email">
        Invite Groupmates (Max 10)
      </label>
      <div className="flex-container">
        <input
            id="email"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="email-input"
            placeholder="Group Member Email"
        />
        <button
            onClick={handleAddEmail}
            className="add-button"
            disabled={groupEmails.length >= 10}
        >
            Add
        </button>
    </div>
      
    </div>

    {/* Display Added Emails */}
    <div className="email-grid">
      {groupEmails.map((email, index) => (
        <div key={index} className="email-item">
          <span className="truncate">{email}</span>
          <button
            onClick={() => handleRemoveEmail(email)}
            className="remove-button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
    {error && <p className="error">{error}</p>}
    {/* Submit Button */}
    <button onClick={handleSubmit} className="button">
      Create
    </button>
  </div>
</div>

  );
};

export default CreateTrip;
