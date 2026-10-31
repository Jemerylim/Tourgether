import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Pencil } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import PageLayout from "../../components/PageLayout/PageLayout";
import PhotoDrop from "../../components/PhotoDrop/PhotoDrop";
import { ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";

const Profile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data.user);
        setName(response.data.user.name);
        setEmail(response.data.user.email);
        setBio(response.data.user.bio || "");
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
          return;
        }
        setError(apiErrorMessage(err, "Couldn't load your profile"));
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Preview the chosen photo; release the object URL when it changes or the page closes.
  useEffect(() => {
    if (!profilePicture) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(profilePicture);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePicture]);

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

    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/users/update-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Fetch updated data from server after update
      const updatedUserResponse = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(updatedUserResponse.data.user);
      setProfilePicture(null);
      setIsEditing(false);
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't update your profile"), "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setBio(user.bio || "");
    setProfilePicture(null);
    setIsEditing(false);
  };

  const photoUrl = user?.profilePicture ? `${API_URL}/${user.profilePicture}` : undefined;

  let content;
  if (error) {
    content = <ErrorState message={error} onRetry={() => window.location.reload()} />;
  } else if (!user) {
    content = <LoadingState message="Loading your profile..." />;
  } else {
    content = (
      <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
        {/* Passport-style photo card */}
        <div className="flex flex-col items-center rounded-3xl bg-white p-8 text-center drop-shadow-ticket">
          <Avatar src={preview || photoUrl} name={isEditing ? name : user.name} size="lg" />
          <p className="mt-5 break-words font-display text-2xl text-ink">{isEditing ? name || "Your name" : user.name}</p>
          <p className="mt-1 break-all text-sm text-ink-soft">{isEditing ? email : user.email}</p>
          {isEditing && (
            <div className="mt-5 w-full">
              <PhotoDrop onFile={setProfilePicture} />
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-lagoon-light p-8">
          {!isEditing ? (
            <>
              <h2 className="font-display text-2xl text-ink">About you</h2>
              <p className={`mt-3 max-w-prose ${user.bio ? "text-ink-deep" : "text-ink-soft"}`}>
                {user.bio || "You haven't added a bio yet. Tell your travel group a little about yourself."}
              </p>
              <button className="btn-dark mt-6" onClick={() => setIsEditing(true)}>
                <Pencil size={16} aria-hidden="true" />
                Edit profile
              </button>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="field-label">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  className="field bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="field-label">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="field bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-bio" className="field-label">
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  className="field bg-white"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" className="btn-ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <PageLayout maxWidth="max-w-4xl" title="My profile" subtitle="How your travel group sees you.">
      {content}
    </PageLayout>
  );
};

export default Profile;
