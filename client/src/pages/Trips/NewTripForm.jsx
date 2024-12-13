import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import "./NewTripForm.css";

const CreateTrip = () => {
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
      const response = await axios.get(`/api/users/check-email`, {
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
    if (groupEmails.length === 0) {
      setError("Please add at least one email to the group.");
      return;
    }

    setError(""); // Clear previous errors

    try {
      // Map emails to user IDs
      const response = await axios.post(`/api/users/get-ids-by-emails`, {
        emails: groupEmails,
      });

      const { userIds } = response.data; // Expecting { userIds: [...] }

      const tripDetails = {
        name: groupName,
        members: userIds,
        startDate: pickThroughVote ? "" : startDate, // Send empty string if 'Pick through vote' is selected
        endDate: pickThroughVote ? "" : endDate, // Send empty string if 'Pick through vote' is selected
      };

      // Call to create trip
      const tripResponse = await axios.post(`/api/trips/create-trip`, tripDetails);

      alert("Trip created successfully!");
      console.log("Created Trip:", tripResponse.data);
    } catch (error) {
      console.error("Error creating trip:", error.response?.data?.message || error.message);
      setError(error.response?.data?.message || "Server error. Please try again later.");
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
          onChange={(e) => setStartDate(e.target.value)}
          disabled={pickThroughVote}
          className="input-date"
        />
        <span>—</span>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={pickThroughVote}
          className="input-date"
        />
      </div>
    </div>

    {/* Checkbox for "Pick through vote" */}
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
      {error && <p className="error">{error}</p>}
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

    {/* Submit Button */}
    <button onClick={handleSubmit} className="button">
      Create
    </button>
  </div>
</div>

  );
};

export default CreateTrip;
