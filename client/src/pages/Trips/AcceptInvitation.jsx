import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/Navbar/Navbar';
import Scene from '../../components/Scene/Scene';
import Ticket from '../../components/Ticket/Ticket';
import { LoadingState } from '../../components/PageState/PageState';
import { API_URL } from "../../config";
import { apiErrorMessage } from '../../lib/apiError';
import { getToken, clearToken } from "../../api/session";

const AcceptInvitation = () => {
  const { tripId } = useParams();
  const userId = new URLSearchParams(window.location.search).get('userId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitationStatus, setInvitationStatus] = useState('');
  const [invitedUser, setInvitedUser] = useState(null);

  useEffect(() => {
    const checkInvitationStatus = async () => {
      const authToken = getToken();
  
      if (!authToken) {
        console.log('No auth token found, redirecting to login.');
        navigate(`/login?redirect=/trip/${tripId}/accept?userId=${userId}`, { replace: true });
        return;
      }
  
      try {
        console.log(`Checking invitation status for tripId: ${tripId}, userId: ${userId}`);
        
        // Fetch invitation status
        const statusResponse = await axios.get(
          `${API_URL}/api/trips/${tripId}/status?userId=${userId}`
        );
        console.log('Invitation status:', statusResponse.data.status);
        setInvitationStatus(statusResponse.data.status);
  
        // Fetch current user profile
        const profileResponse = await axios.get(
          `${API_URL}/api/users/profile`
        );
        const currentUserId = profileResponse.data.user._id;
        setInvitedUser(profileResponse.data.user.name);
  
        console.log('currentUserId from profile:', currentUserId);
        console.log('userId from URL:', userId);
  
        // Compare the current user ID with the invited user ID
        if (currentUserId && userId && String(currentUserId) !== String(userId)) {
          console.log('User mismatch. Not the invitee.');
          setError('You are not the invitee for this trip.');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setError('You were not invited to this trip.');
        } else if (error.response?.status === 401) {
          console.log('Session expired or unauthorized. Redirecting to login.');
          clearToken();
          navigate(`/login?redirect=/trip/${tripId}/accept?userId=${userId}`, { replace: true });
        } else {
          console.error('Error fetching invitation status or profile:', error);
          setError(apiErrorMessage(error, "Couldn't check this invitation"));
        }
      } finally {
        setLoading(false);
      }
    };
  
    checkInvitationStatus();
  }, [tripId, userId, navigate]);  

  const handleAccept = async () => {
    const authToken = getToken();
    try {
      console.log('Accepting invitation...');
      await axios.post(
        `${API_URL}/api/trips/${tripId}/accept-invitation`,
        { userId }
      );
      setInvitationStatus('accepted');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(apiErrorMessage(error, "Couldn't accept the invitation"));
    }
  };

  const handleDecline = async () => {
    const authToken = getToken();
    try {
      console.log('Declining invitation...');
      await axios.delete(
        `${API_URL}/api/trips/${tripId}/decline-invitation`,
        {
          data: { userId }, // Pass userId in the request body
        }
      );
      setInvitationStatus('declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      setError(apiErrorMessage(error, "Couldn't decline the invitation"));
    }
  };  

  const accepted = invitationStatus === 'accepted';
  const declined = invitationStatus === 'declined';

  let heading;
  let body;
  let stubClass = 'bg-mustard';
  let stub;

  if (error) {
    heading = "This invitation didn't work";
    body = error;
    stub = (
      <Link to="/my-trips" className="btn-dark">
        See my trips
      </Link>
    );
  } else if (accepted) {
    heading = "You're on the trip";
    body = 'You have joined this trip. Everything the group plans will show up on its calendar.';
    stubClass = 'bg-lagoon-light';
    stub = (
      <Link to={`/trip/${tripId}`} className="btn-primary">
        Open trip
      </Link>
    );
  } else if (declined) {
    heading = 'Invitation declined';
    body = "You won't be added to this trip. If you change your mind, ask the organiser to invite you again.";
    stubClass = 'bg-lagoon-light';
    stub = (
      <Link to="/my-trips" className="btn-dark">
        Back to my trips
      </Link>
    );
  } else {
    heading = "You're invited";
    body = invitedUser
      ? `Hi ${invitedUser}, you've been invited to join a trip on Tourgether.`
      : "You've been invited to join a trip on Tourgether.";
    stub = (
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleAccept} className="btn-dark">
          Join trip
        </button>
        <button onClick={handleDecline} className="btn-ghost">
          Decline
        </button>
      </div>
    );
  }

  return (
    <div className="text-left">
      <Navbar overlay />
      <Scene className="-mt-[76px] min-h-screen pt-[76px]" sunClassName="right-[14%] top-[24%] h-72 w-72">
        <main className="relative z-10 flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-10">
          {loading ? (
            <LoadingState message="Checking your invitation..." />
          ) : (
            <Ticket
              stacked
              className="w-full max-w-md"
              main={
                <div className="p-2 sm:p-4">
                  <h1 className="font-display text-4xl text-ink">{heading}</h1>
                  <p className={`mt-3 ${error ? 'font-bold text-red-700' : 'text-ink-soft'}`} role={error ? 'alert' : undefined}>
                    {body}
                  </p>
                </div>
              }
              stubClassName={`px-6 py-5 ${stubClass}`}
              stub={stub}
            />
          )}
        </main>
      </Scene>
    </div>
  );
};

export default AcceptInvitation;
