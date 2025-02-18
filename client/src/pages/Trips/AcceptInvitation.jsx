import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AcceptInvitation.css';

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
      const authToken = localStorage.getItem('authToken');
  
      if (!authToken) {
        console.log('No auth token found, redirecting to login.');
        navigate(`/login?redirect=/trip/${tripId}/accept?userId=${userId}`);
        return;
      }
  
      try {
        console.log(`Checking invitation status for tripId: ${tripId}, userId: ${userId}`);
        
        // Fetch invitation status
        const statusResponse = await axios.get(
          `http://44.211.206.111:5000/api/trips/${tripId}/status?userId=${userId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        console.log('Invitation status:', statusResponse.data.status);
        setInvitationStatus(statusResponse.data.status);
  
        // Fetch current user profile
        const profileResponse = await axios.get(
          `http://44.211.206.111:5000/api/users/profile`,
          { headers: { Authorization: `Bearer ${authToken}` } }
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
          localStorage.removeItem('authToken');
          navigate(`/login?redirect=/trip/${tripId}/accept?userId=${userId}`);
        } else {
          console.error('Error fetching invitation status or profile:', error);
          setError('Failed to check invitation status. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
  
    checkInvitationStatus();
  }, [tripId, userId, navigate]);  

  const handleAccept = async () => {
    const authToken = localStorage.getItem('authToken');
    try {
      console.log('Accepting invitation...');
      await axios.post(
        `http://44.211.206.111:5000/api/trips/${tripId}/accept-invitation`,
        { userId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setInvitationStatus('accepted');
      alert('You have successfully joined the trip!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation. Please try again later.');
    }
  };

  const handleDecline = async () => {
    const authToken = localStorage.getItem('authToken');
    try {
      console.log('Declining invitation...');
      await axios.delete(
        `http://44.211.206.111:5000/api/trips/${tripId}/decline-invitation`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { userId }, // Pass userId in the request body
        }
      );
      setInvitationStatus('declined');
      alert('You have declined the invitation.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error declining invitation:', error);
      setError('Failed to decline invitation. Please try again later.');
    }
  };  

  if (loading) return <div>Loading...</div>;

  return (
    <div className="invitation-container">
      <h1>Join the Trip!</h1>
      {invitedUser && <p>Hi <strong>{invitedUser}</strong>, you have been invited to join this trip.</p>}
      {error ? (
        <p className="error-message">{error}</p>
      ) : invitationStatus === 'accepted' ? (
        <p>
          You have already <strong style={{ color: 'green' }}>accepted</strong> this invitation.
        </p>
      ) : invitationStatus === 'declined' ? (
        <p>
          You have <strong style={{ color: 'red' }}>declined</strong> this invitation.
        </p>
      ) : (
        <>
          <p>You have been invited to join this trip. Click below to accept or decline the invitation.</p>
          <button onClick={handleAccept} className="accept-button">Accept Invitation</button>
          <button onClick={handleDecline} className="decline-button">Decline Invitation</button>
        </>
      )}
      <p className="back-to-dashboard">
        <a href="/dashboard">See My Trips</a>
      </p>
    </div>
  );
};

export default AcceptInvitation;
