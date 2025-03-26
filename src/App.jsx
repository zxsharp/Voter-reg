import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import './App.css'

// Configuration
const API_CONFIG = {
  baseUrl: 'http://localhost:3001/api',
  endpoints: {
    idReg: '/id-reg',
    photoReg: '/photo-reg'
  }
};

const USER_INFO = {
  login: 'zxsharp (fsociety)',
  currentUtcTime: () => {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
  }
};

const WebcamRegistration = () => {
  const [state, setState] = useState({
    step: 'id',
    error: '',
    vidNumber: null,
    isLoading: false,
    hasPermission: null,
    lastAttemptTime: null
  });
  const webcamRef = useRef(null);

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: "user"
  };

  const handleUserMedia = useCallback(() => {
    setState(prev => ({ ...prev, hasPermission: true, error: '' }));
  }, []);

  const handleUserMediaError = useCallback((error) => {
    setState(prev => ({ 
      ...prev, 
      hasPermission: false,
      error: getErrorMessage(error),
      lastAttemptTime: USER_INFO.currentUtcTime()
    }));
  }, []);

  const getErrorMessage = (error) => {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera access was denied. Please allow camera access to continue.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera device was found. Please connect a camera and try again.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your camera is in use by another application. Please close other apps using the camera.';
      case 'OverconstrainedError':
        return 'Camera constraints not satisfied. Please try a different camera.';
      default:
        return `Camera error: ${error.message || 'Please check your camera and try again.'}`;
    }
  };

  const makeApiRequest = async (endpoint, data) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          timestamp: USER_INFO.currentUtcTime(),
          userLogin: USER_INFO.login
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred');
      }

      return result;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  };

  const capture = async () => {
    if (!webcamRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Camera not initialized. Please refresh the page.',
        lastAttemptTime: USER_INFO.currentUtcTime()
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: '',
      lastAttemptTime: USER_INFO.currentUtcTime()
    }));
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        throw new Error('Failed to capture image. Please try again.');
      }

      if (state.step === 'id') {
        const result = await makeApiRequest(API_CONFIG.endpoints.idReg, { 
          image: imageSrc
        });
        
        if (result.vidNumber) {
          setState(prev => ({
            ...prev,
            vidNumber: result.vidNumber,
            step: 'face',
            isLoading: false,
            error: ''
          }));
        }
      } else {
        const result = await makeApiRequest(API_CONFIG.endpoints.photoReg, { 
          image: imageSrc,
          vidNumber: state.vidNumber
        });
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            step: 'success',
            isLoading: false,
            error: ''
          }));
        }
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An error occurred. Please try again.',
        isLoading: false
      }));
      console.error('Error:', err);
    }
  };

  const retryCamera = () => {
    setState(prev => ({
      ...prev,
      error: '',
      hasPermission: null,
      lastAttemptTime: USER_INFO.currentUtcTime()
    }));
  };

  return (
    <div className="webcam-registration">
      {/* User Info Header */}
      <div className="user-info-header">
        <div className="user-info">
          <span>User: {USER_INFO.login}</span>
          <span>UTC Time: {USER_INFO.currentUtcTime()}</span>
        </div>
      </div>

      <h2>
        {state.step === 'id' ? 'Take ID Photo' : 
         state.step === 'face' ? 'Take Face Photo' : 
         'Registration Complete'}
      </h2>
      
      {state.step !== 'success' && (
        <div className="camera-section">
          {state.hasPermission !== false ? (
            <div className="webcam-container">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
              />
            </div>
          ) : (
            <div className="camera-error">
              <p>{state.error}</p>
              {state.lastAttemptTime && (
                <p className="error-timestamp">Error occurred at: {state.lastAttemptTime}</p>
              )}
              <button 
                onClick={retryCamera}
                className="retry-button"
              >
                Retry Camera Access
              </button>
            </div>
          )}
          
          {state.hasPermission && (
            <div className="action-container">
              <button 
                onClick={capture}
                disabled={state.isLoading}
                className="capture-button"
              >
                {state.isLoading ? 'Processing...' : 'Capture Photo'}
              </button>
              
              {state.error && (
                <div className="error-message">
                  <p>{state.error}</p>
                  {state.lastAttemptTime && (
                    <p className="error-timestamp">Error occurred at: {state.lastAttemptTime}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {state.step === 'success' && (
        <div className="success-message">
          <h3>Registration Successful!</h3>
          <p>Your registration has been completed successfully.</p>
          <p>Registration ID: {state.vidNumber}</p>
          <p>Completed at: {USER_INFO.currentUtcTime()}</p>
          <p>Registered by: {USER_INFO.login}</p>
        </div>
      )}
    </div>
  );
};

export default WebcamRegistration;