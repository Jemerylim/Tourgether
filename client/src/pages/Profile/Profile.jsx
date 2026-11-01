import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../api/client";
import { Camera, Compass, Pencil, Settings } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import PageLayout from "../../components/PageLayout/PageLayout";
import PhotoDrop from "../../components/PhotoDrop/PhotoDrop";
import { ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import { API_URL, assetUrl } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import useUserTrips from "../../lib/useUserTrips";
import ProfileTravel from "./ProfileTravel";
import { StyleChips, StylePicker } from "./TravelStyles";
import { getToken, clearToken } from "../../api/session";

const Profile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [travelStyles, setTravelStyles] = useState([]);
  const { trips, loading: tripsLoading, error: tripsError } = useUserTrips();
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/users/profile`);

        setUser(response.data.user);
        setName(response.data.user.name);
        setEmail(response.data.user.email);
        setBio(response.data.user.bio || "");
        setTravelStyles(response.data.user.travelStyles || []);
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (err.response?.status === 401) {
          clearToken();
          navigate("/login", { replace: true });
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
    const token = getToken();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    formData.append("travelStyles", JSON.stringify(travelStyles));
    if (profilePicture) {
      formData.append("profilePicture", profilePicture);
    }

    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/users/update-profile`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Fetch updated data from server after update
      const updatedUserResponse = await axios.get(`${API_URL}/api/users/profile`);

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

  // Clicking the photo: while editing the file is saved with the form, otherwise it uploads at once.
  const handlePhotoPicked = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }
    if (isEditing) {
      setProfilePicture(file);
      return;
    }

    const token = getToken();
    const formData = new FormData();
    formData.append("profilePicture", file);
    setProfilePicture(file); // shows the preview while uploading
    setUploading(true);
    try {
      await axios.put(`${API_URL}/api/users/update-profile`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = await axios.get(`${API_URL}/api/users/profile`);
      setUser(res.data.user);
      showToast("Photo updated", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't update your photo"), "error");
    } finally {
      setProfilePicture(null);
      setUploading(false);
    }
  };

  const cancelEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setBio(user.bio || "");
    setTravelStyles(user.travelStyles || []);
    setProfilePicture(null);
    setIsEditing(false);
  };

  const photoUrl = assetUrl(user?.profilePicture);

  let content;
  if (error) {
    content = <ErrorState message={error} onRetry={() => window.location.reload()} />;
  } else if (!user) {
    content = <LoadingState message="Loading your profile..." />;
  } else {
    content = (
      <>
      <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
        {/* Passport-style photo card */}
        <div className="flex flex-col items-center rounded-3xl bg-white p-8 text-center drop-shadow-ticket">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
            className="group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard"
          >
            <Avatar src={preview || photoUrl} name={isEditing ? name : user.name} size="lg" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-ink/60 text-sm font-extrabold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera size={28} aria-hidden="true" />
              {uploading ? "Uploading..." : "Change photo"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              handlePhotoPicked(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
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
              <h3 className="mb-2 mt-6 text-sm font-extrabold text-ink-soft">Travel style</h3>
              {user.travelStyles?.length > 0 ? (
                <StyleChips styles={user.travelStyles} />
              ) : (
                <p className="text-ink-soft">
                  Not sure how you travel?{" "}
                  <Link to="/quiz" className="inline-flex items-center gap-1 font-extrabold text-plum underline hover:text-plum">
                    <Compass size={15} aria-hidden="true" />
                    Take the travel quiz
                  </Link>{" "}
                  and we'll fill this in, or pick your own when you edit.
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button className="btn-dark" onClick={() => setIsEditing(true)}>
                  <Pencil size={16} aria-hidden="true" />
                  Edit profile
                </button>
                <Link to="/settings" className="btn-ghost">
                  <Settings size={16} aria-hidden="true" />
                  Account settings
                </Link>
              </div>
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
                <p className="field-label">Email</p>
                <p className="rounded-xl bg-white px-4 py-3 text-ink-deep">{user.email}</p>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Changing your email needs your password.{" "}
                  <Link to="/settings" className="font-extrabold text-plum underline hover:text-plum">
                    Open settings
                  </Link>
                </p>
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
              <StylePicker value={travelStyles} onChange={setTravelStyles} />
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
      {!tripsLoading && !tripsError && <ProfileTravel trips={trips} userId={user._id} />}
      </>
    );
  }

  return (
    <PageLayout maxWidth="max-w-5xl" title="My profile" subtitle="How your travel group sees you.">
      {content}
    </PageLayout>
  );
};

export default Profile;
