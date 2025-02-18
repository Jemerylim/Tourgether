import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await axios.get("http://44.211.206.111:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data.user);
        setName(response.data.user.name);
        setEmail(response.data.user.email);
        setBio(response.data.user.bio || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("bio", bio);
    if (profilePicture) {
      formData.append("profilePicture", profilePicture);
    }

    try {
      await axios.put("http://44.211.206.111:5000/api/users/update-profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Fetch updated data from server after update
      const updatedUserResponse = await axios.get("http://44.211.206.111:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(updatedUserResponse.data.user);
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      setMessage("Error updating profile. Try again.");
    }
  };

  return (
    <div className="profile-container">
      <Navbar />
      <h1 className="page-title">My Profile</h1>
      {message && <p className="message">{message}</p>}

      {user && (
        <div className="profile-box">
          <img
            src={user?.profilePicture ? `http://44.211.206.111:5000/${user.profilePicture}` : "http://44.211.206.111:5000/uploads/profile-pic.jpg"}
            alt="Profile"
            className="profile-img"
          />

          {!isEditing ? (
            <>
              <h3>{user.name}</h3>
              <p className="email">{user.email}</p>
              <p className="bio">{user.bio || "No bio available."}</p>
              <button className="save-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </>
          ) : (
            <div className="profile-edit">
              <label>Profile Picture:</label>
              <input type="file" onChange={handleFileChange} accept="image/*" />

              <label>Name:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

              <label>Email:</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

              <label>Bio:</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} />

              <div className="profile-buttons">
                <button className="save-btn" onClick={handleUpdateProfile}>Save</button>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
