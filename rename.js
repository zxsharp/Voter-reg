const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for base64 images

// Simple in-memory storage for demonstration
const registrations = new Map();

// ID Registration endpoint
app.post('/api/id-reg', (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({
      error: 'No image data provided'
    });
  }

  // Simulate image validation
  if (image.length < 1000) { // Very basic check for demonstration
    return res.status(400).json({
      error: 'Invalid image data. Please take a clear photo.'
    });
  }

  try {
    // Simulate processing delay
    setTimeout(() => {
      // Generate a random VID number
      const vidNumber = 'VID' + Math.floor(100000 + Math.random() * 900000);
      
      // Store the vidNumber and image for later verification
      registrations.set(vidNumber, {
        idImage: image,
        timestamp: new Date().toISOString(),
        faceVerified: false 
      });

      res.json({ vidNumber });
    }, 1500);
  } catch (error) {
    res.status(500).json({
      error: 'Server error processing ID image. Please try again.'
    });
  }
});

// Face Photo Registration endpoint
app.post('/api/photo-reg', (req, res) => {
  const { image, vidNumber } = req.body;

  if (!image || !vidNumber) {
    return res.status(400).json({
      error: 'Missing required information'
    });
  }

  if (!registrations.has(vidNumber)) {
    return res.status(404).json({
      error: 'Invalid VID number. Please start the registration process again.'
    });
  }

  try {
    // Simulate processing delay
    setTimeout(() => {
      const registration = registrations.get(vidNumber);
      
      // Simulate some basic validation
      if (new Date() - new Date(registration.timestamp) > 3600000) { // 1 hour expiry
        registrations.delete(vidNumber);
        return res.status(400).json({
          error: 'Registration session expired. Please start again.'
        });
      }

      // Simulate random verification failure (20% chance)
      if (Math.random() < 0.2) {
        return res.status(400).json({
          error: 'Face verification failed. Please ensure proper lighting and try again.'
        });
      }

      // Mark as verified and store face photo
      registration.faceVerified = true;
      registration.faceImage = image;
      registrations.set(vidNumber, registration);

      res.json({
        success: true,
        message: 'Registration completed successfully'
      });
    }, 1500);
  } catch (error) {
    res.status(500).json({
      error: 'Server error processing face photo. Please try again.'
    });
  }
});

// Optional: Endpoint to check registration status
app.get('/api/registration/:vidNumber', (req, res) => {
  const { vidNumber } = req.params;
  
  if (!registrations.has(vidNumber)) {
    return res.status(404).json({
      error: 'Registration not found'
    });
  }

  const registration = registrations.get(vidNumber);
  res.json({
    vidNumber,
    timestamp: registration.timestamp,
    faceVerified: registration.faceVerified
  });
});

// Clean up expired registrations periodically
setInterval(() => {
  const now = new Date();
  for (const [vidNumber, registration] of registrations.entries()) {
    if (now - new Date(registration.timestamp) > 3600000) { // 1 hour
      registrations.delete(vidNumber);
    }
  }
}, 300000); // Clean up every 5 minutes

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
