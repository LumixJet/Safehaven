import React, { useState, useCallback, useEffect, useRef } from 'react';
import './ReportHandler.css';

// API base URL from environment variables or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper function to calculate distance between two lat/lng points in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1); // Difference in latitude, converted to radians
  const dLon = deg2rad(lon2 - lon1); // Difference in longitude, converted to radians
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); // Haversine formula part 1
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Haversine formula part 2
  return R * c; // Distance in kilometers
};

// Helper function to convert degrees to radians
const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// ReportHandler component manages safety report submission and hotspot visualization
const ReportHandler = ({
  map, // Google Map instance
  currentLocation, // User's current location { lat, lng }
  selectedLocation, // Manually selected location { lat, lng }
  setSelectedLocation, // Function to update selected location
  safetyData, // Array of safety reports
  setSafetyData, // Function to update safety reports
  setErrorMessage, // Function to set error messages
  setStatusMessage, // Function to set status messages
}) => {
  // State for controlling report form visibility
  const [showReportForm, setShowReportForm] = useState(false);
  // State for report type (unsafe, suspicious, incident, safe)
  const [reportType, setReportType] = useState('unsafe');
  // State for report severity (1-5)
  const [reportSeverity, setReportSeverity] = useState(3);
  // State for report description text
  const [reportDescription, setReportDescription] = useState('');
  // State for report submission status (empty, submitting, success, error)
  const [reportStatus, setReportStatus] = useState('');
  // State for model status from backend (isReady, isTraining, etc.)
  const [modelStatus, setModelStatus] = useState(null);
  // State for report markers on the map
  const [markers, setMarkers] = useState([]);
  // Ref to store markers for cleanup without triggering re-renders
  const markersRef = useRef([]);
  // State for model loading status
  const [isModelLoading, setIsModelLoading] = useState(true);
  // State for hotspot markers on the map
  const [hotspotMarkers, setHotspotMarkers] = useState([]);
  // Ref to store hotspot markers for cleanup
  const hotspotMarkersRef = useRef([]);
  // State for nearest safe location within 2km
  const [nearestSafeLocation, setNearestSafeLocation] = useState(null);

  // Effect to fetch model status and hotspots from backend
  useEffect(() => {
    const fetchModelStatus = async () => {
      try {
        setIsModelLoading(true); // Show loading indicator
        const response = await fetch(`${API_BASE_URL}/api/safety/model-status`);
        if (!response.ok) throw new Error('Failed to fetch model status');
        const data = await response.json();

        if (data && !data.isReady) {
          // If model isn't ready, retry after 5 seconds
          setTimeout(fetchModelStatus, 5000);
        } else {
          setModelStatus(data); // Update model status
          
          // If no hotspots, trigger generation
          if (!data.predictedHotspots || data.predictedHotspots.length === 0) {
            console.log('No hotspots found, attempting to generate them');
            try {
              await fetch(`${API_BASE_URL}/api/safety/generate-hotspots`, { method: 'POST' });
              setTimeout(fetchModelStatus, 3000); // Retry after generation
            } catch (hotspotError) {
              console.error('Error generating hotspots:', hotspotError);
            }
          } else {
            // Visualize hotspots on the map
            visualizeHotspots(map, data.predictedHotspots, currentLocation);
          }
        }
        setIsModelLoading(false); // Hide loading indicator
      } catch (error) {
        console.error('Error fetching model status:', error);
        setErrorMessage(`Error fetching model status: ${error.message}`);
        setIsModelLoading(false);
      }
    };

    fetchModelStatus(); // Initial fetch
    const interval = setInterval(fetchModelStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [map, currentLocation, setErrorMessage]);

  // Function to add a marker for a safety report on the map
  const addReportMarker = useCallback((googleMap, report) => {
    if (!googleMap || !report || !report.location) {
      console.error('Invalid map, report or location:', { map: googleMap, report });
      return null;
    }

    let position;
    try {
      // Normalize location format to { lat, lng }
      if (report.location.lat !== undefined && report.location.lng !== undefined) {
        position = { lat: Number(report.location.lat), lng: Number(report.location.lng) };
      } else if (report.location.latitude !== undefined && report.location.longitude !== undefined) {
        position = { lat: Number(report.location.latitude), lng: Number(report.location.longitude) };
      } else if (report.location.type === 'Point' && Array.isArray(report.location.coordinates)) {
        position = { lat: Number(report.location.coordinates[1]), lng: Number(report.location.coordinates[0]) };
      } else {
        console.error('Invalid location format:', report.location);
        return null;
      }

      if (isNaN(position.lat) || isNaN(position.lng)) {
        console.error('Latitude or longitude is not a number:', position);
        return null;
      }
    } catch (error) {
      console.error('Error parsing location data:', error);
      return null;
    }

    if (!window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      return null;
    }

    // Set marker color based on report type
    const markerColor = report.type === 'safe' ? '#22c55e' : 
                       report.type === 'suspicious' ? '#f97316' : '#ef4444';

    try {
      const marker = new window.google.maps.Marker({
        position, // Marker position
        map: googleMap, // Attach to map
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE, // Circle shape
          scale: 8, // Size of marker
          fillColor: markerColor, // Color based on type
          fillOpacity: 0.8, // Transparency
          strokeColor: '#ffffff', // White border
          strokeWeight: 1, // Border thickness
        },
        title: report.description || 'No description', // Hover text
      });

      // Create info window with report details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #fff; background: ${markerColor}; padding: 8px; border-radius: 5px;">
            <div style="font-weight: 600">${report.type ? (report.type.charAt(0).toUpperCase() + report.type.slice(1)) : 'Unknown'} Area</div>
            <div>${report.description || 'No description'}</div>
            <div style="font-size: 0.85em">Reported: ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Unknown time'}</div>
          </div>`,
      });

      marker.addListener('click', () => infoWindow.open(googleMap, marker)); // Show info window on click
      return marker;
    } catch (error) {
      console.error('Error creating marker:', error);
      return null;
    }
  }, []);

  // Function to clear all report markers from the map
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && typeof marker.setMap === 'function') {
        marker.setMap(null); // Remove from map
      }
    });
    markersRef.current = []; // Clear ref
    setMarkers([]); // Clear state
  }, []);

  // Function to fetch safety reports within 2km of a location
  const fetchReports = useCallback(
    async (googleMap, location) => {
      try {
        if (!googleMap || !location) {
          console.error('Map or location not available for fetching reports');
          return;
        }

        let lat = Number(location.lat || location.latitude);
        let lng = Number(location.lng || location.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          console.error('Invalid location coordinates:', { lat, lng });
          return;
        }

        const normalizedLocation = { lat, lng };

        // Fetch reports within 2km radius
        const response = await fetch(
          `${API_BASE_URL}/api/safety/reports?location=${encodeURIComponent(JSON.stringify(normalizedLocation))}&radius=2`
        );

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const rawReports = await response.json();

        if (!Array.isArray(rawReports)) {
          console.error('Expected array from API but got:', rawReports);
          return;
        }

        clearMarkers(); // Remove existing markers

        // Normalize and filter reports
        const reports = rawReports
          .filter(report => report && report.location)
          .map(report => {
            try {
              if (report.location.type === 'Point' && Array.isArray(report.location.coordinates)) {
                return {
                  ...report,
                  location: {
                    lat: report.location.coordinates[1],
                    lng: report.location.coordinates[0]
                  }
                };
              }

              const loc = report.location;
              const reportLat = Number(loc.lat || loc.latitude);
              const reportLng = Number(loc.lng || loc.longitude);

              if (isNaN(reportLat) || isNaN(reportLng)) {
                console.error('Invalid report location:', report.location);
                return null;
              }

              return { 
                ...report, 
                location: { lat: reportLat, lng: reportLng } 
              };
            } catch (error) {
              console.error('Error processing report:', error);
              return null;
            }
          })
          .filter(Boolean);

        // Add markers for each report
        const newMarkers = reports
          .map(report => addReportMarker(googleMap, report))
          .filter(Boolean);

        markersRef.current = newMarkers; // Update ref
        setMarkers(newMarkers); // Update state
        setSafetyData(reports); // Update safety data

        // Save to localStorage for persistence
        try {
          localStorage.setItem('safetyReports', JSON.stringify(reports));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      } catch (error) {
        console.error('Error in fetchReports:', error);
        setErrorMessage(`Error fetching reports: ${error.message}. Please try again.`);
      }
    },
    [addReportMarker, clearMarkers, setSafetyData, setErrorMessage]
  );

  // Function to submit a new safety report
  const submitReport = async (e) => {
    e.preventDefault();

    try {
      const reportLocation = selectedLocation || currentLocation;

      if (!reportLocation) {
        setReportStatus('error');
        setStatusMessage('No location available');
        return;
      }

      let lat = Number(reportLocation.lat || reportLocation.latitude);
      let lng = Number(reportLocation.lng || reportLocation.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setReportStatus('error');
        setStatusMessage('Invalid location coordinates');
        return;
      }

      if (!reportDescription || reportDescription.trim().length < 5) {
        setReportStatus('error');
        setStatusMessage('Description too short (min 5 characters)');
        return;
      }

      setReportStatus('submitting');
      setStatusMessage('Submitting report...');

      const normalizedLocation = { lat, lng };

      // Send report to backend
      const response = await fetch(`${API_BASE_URL}/api/safety/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: normalizedLocation,
          description: reportDescription.trim(),
          type: reportType,
          severity: reportSeverity,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.report) {
        throw new Error('Invalid response from server');
      }

      // Reset form
      setReportDescription('');
      setReportStatus('success');
      setStatusMessage('Report submitted successfully');
      setShowReportForm(false);
      setSelectedLocation(null);

      // Add new marker for the report
      if (map && data.report) {
        const newMarker = addReportMarker(map, data.report);
        if (newMarker) {
          markersRef.current = [...markersRef.current, newMarker];
          setMarkers(prev => [...prev, newMarker]);
          setSafetyData(prev => [...prev, data.report]);
        }
      }

      // Trigger model training for significant reports
      if (reportSeverity >= 4 || reportType === 'unsafe' || reportType === 'incident') {
        try {
          await fetch(`${API_BASE_URL}/api/safety/trigger-training`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('Triggered model training due to significant report');
        } catch (trainError) {
          console.error('Error triggering model training:', trainError);
        }
      }

      // Clear status after 5 seconds
      setTimeout(() => {
        setReportStatus('');
        setStatusMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setReportStatus('error');
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  // Effect to fetch reports when map or location changes
  useEffect(() => {
    if (map && currentLocation) {
      fetchReports(map, currentLocation);
    }
  }, [map, currentLocation, fetchReports]);

  // Effect to clean up markers on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, [clearMarkers]);

  // Function to visualize hotspots on the map within 2km
  const visualizeHotspots = useCallback((googleMap, hotspots, currentLoc) => {
    // Clear existing hotspot markers
    hotspotMarkersRef.current.forEach(marker => {
      if (marker && typeof marker.setMap === 'function') {
        marker.setMap(null);
      }
    });
    hotspotMarkersRef.current = [];

    if (!googleMap || !hotspots || !Array.isArray(hotspots) || !currentLoc) {
      setHotspotMarkers([]);
      setNearestSafeLocation(null);
      return;
    }

    const userLat = currentLoc.lat || currentLoc.latitude;
    const userLng = currentLoc.lng || currentLoc.longitude;

    // Filter hotspots within 2km
    const nearbyHotspots = hotspots.filter(hotspot => {
      if (!hotspot.location) return false;
      const distance = calculateDistance(
        userLat,
        userLng,
        hotspot.location.lat,
        hotspot.location.lng
      );
      return distance <= 2; // 2km radius
    });

    let nearest = null;
    let nearestDistance = Infinity;

    // Find nearest safe hotspot
    nearbyHotspots.forEach(hotspot => {
      if (hotspot.category === 'safe' && hotspot.location) {
        const distance = calculateDistance(
          userLat, userLng,
          hotspot.location.lat, hotspot.location.lng
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { ...hotspot, distanceKm: distance.toFixed(2) };
        }
      }
    });

    setNearestSafeLocation(nearest);

    // Create markers for nearby hotspots
    const newMarkers = nearbyHotspots.map(hotspot => {
      if (!hotspot.location || !hotspot.category) return null;

      const position = {
        lat: Number(hotspot.location.lat),
        lng: Number(hotspot.location.lng)
      };

      if (isNaN(position.lat) || isNaN(position.lng)) return null;

      const fillColor = hotspot.category === 'safe' ? '#22c55e' : 
                       hotspot.category === 'unsafe' ? '#ef4444' : '#f97316';

      const marker = new window.google.maps.Marker({
        position,
        map: googleMap,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 0.4,
          strokeWeight: 1,
          strokeColor: '#ffffff',
          scale: 30, // Larger for hotspots
        },
        zIndex: 1, // Lower than report markers
        title: `${hotspot.category.toUpperCase()} - Safety Score: ${(hotspot.safetyScore * 100).toFixed(1)}%`
      });

      const distance = calculateDistance(userLat, userLng, position.lat, position.lng);

      // Info window with safety score, confidence, and navigation
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 8px; color: ${fillColor}; text-transform: uppercase;">${hotspot.category} Area</h3>
            <p style="margin: 0 0 5px;">Safety Score: <b>${(hotspot.safetyScore * 100).toFixed(1)}%</b></p>
            <p style="margin: 0 0 5px;">Confidence: <b>${(hotspot.confidence * 100).toFixed(1)}%</b></p>
            <p style="margin: 0 0 5px;">Distance: <b>${distance.toFixed(2)} km</b></p>
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${position.lat},${position.lng}', '_blank')" 
              style="background: #4285f4; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
              Navigate
            </button>
          </div>
        `
      });

      marker.addListener('click', () => infoWindow.open(googleMap, marker));
      return marker;
    }).filter(Boolean);

    hotspotMarkersRef.current = newMarkers;
    setHotspotMarkers(newMarkers);
  }, []);

  // Effect to clean up hotspot markers on unmount
  useEffect(() => {
    return () => {
      hotspotMarkersRef.current.forEach(marker => {
        if (marker && typeof marker.setMap === 'function') {
          marker.setMap(null);
        }
      });
    };
  }, []);

  // Render the component
  return (
    <>
      {/* Control panel with report button */}
      <div className="control-panel">
        <button className="report-button" onClick={() => setShowReportForm(!showReportForm)}>
          {showReportForm ? 'Close Form' : '📌 Submit Report'}
        </button>
      </div>

      {/* Sidebar with safety insights */}
      <div className="model-insights-sidebar">
        <h3>Safety Insights</h3>
        {isModelLoading ? (
          <div className="loading-indicator">
            <p>Loading safety data...</p>
            <div className="loading-spinner"></div>
          </div>
        ) : modelStatus ? (
          <>
            {/* Model status display */}
            <div className="model-status">
              <span>Model Status: <span className={modelStatus.isReady ? "status-active" : "status-initializing"}>
                {modelStatus.isReady ? 'Active' : 'Initializing'}
              </span></span>
              <span>Training: <span className={modelStatus.isTraining ? "status-training" : "status-idle"}>
                {modelStatus.isTraining ? 'In Progress' : 'Complete'}
              </span></span>
              <span>Last Update: <span className="timestamp">
                {modelStatus.lastTrainedAt ? new Date(modelStatus.lastTrainedAt).toLocaleTimeString() : 'Pending'}
              </span></span>
              <span>MSE: <span className="metric-value">
                {modelStatus.modelMSE || modelStatus.modelLoss || 'N/A'}
              </span></span>
            </div>
            {/* List of nearby hotspots */}
            <div className="hotspots-list">
              <h4>Nearby Hotspots (within 2km)</h4>
              {Array.isArray(modelStatus?.predictedHotspots) && modelStatus.predictedHotspots.length > 0 && currentLocation ? (
                modelStatus.predictedHotspots
                  .filter(hotspot => {
                    if (!hotspot.location) return false;
                    const distance = calculateDistance(
                      currentLocation.lat || currentLocation.latitude,
                      currentLocation.lng || currentLocation.longitude,
                      hotspot.location.lat,
                      hotspot.location.lng
                    );
                    return distance <= 2; // 2km radius
                  })
                  .map((hotspot, index) => {
                    const distance = calculateDistance(
                      currentLocation.lat || currentLocation.latitude,
                      currentLocation.lng || currentLocation.longitude,
                      hotspot.location.lat,
                      hotspot.location.lng
                    );
                    return (
                      <div 
                        key={index} 
                        className={`hotspot-item ${hotspot.category || 'unknown'}`}
                        onClick={() => {
                          if (map && hotspot.location) {
                            map.panTo({
                              lat: hotspot.location.lat,
                              lng: hotspot.location.lng
                            });
                            map.setZoom(15);
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat || currentLocation.latitude},${currentLocation.lng || currentLocation.longitude}&destination=${hotspot.location.lat},${hotspot.location.lng}`,
                              '_blank'
                            );
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="hotspot-indicator">
                          {hotspot.category === 'safe' ? '✅' : hotspot.category === 'unsafe' ? '⚠️' : 'ℹ️'}
                        </span>
                        <span>
                          {hotspot.location && typeof hotspot.location.lat === 'number' ? 
                            `${hotspot.location.lat.toFixed(4)}, ${hotspot.location.lng.toFixed(4)}` : 
                            'Unknown location'} 
                          - Score: {hotspot.safetyScore !== undefined ? `${(hotspot.safetyScore * 100).toFixed(1)}%` : 'N/A'}
                          - Confidence: {(hotspot.confidence * 100).toFixed(1)}%
                          - {distance.toFixed(2)} km
                        </span>
                        <span style={{ marginLeft: '10px', color: '#4285f4' }}>
                          [Navigate]
                        </span>
                      </div>
                    );
                  })
              ) : (
                <p>No hotspots within 2km</p>
              )}
            </div>
          </>
        ) : (
          <p>Unable to load model insights. Please try again later.</p>
        )}
      </div>

      {/* Report submission form */}
      {showReportForm && (
        <div className="report-form">
          <form onSubmit={submitReport}>
            <h3>Submit Safety Report</h3>
            <div className="form-group">
              <label>Location</label>
              <div className="location-display">
                {selectedLocation ? (
                  `${typeof selectedLocation.lat === 'number' ? selectedLocation.lat.toFixed(4) : 
                    (typeof selectedLocation.latitude === 'number' ? selectedLocation.latitude.toFixed(4) : '?')}, 
                   ${typeof selectedLocation.lng === 'number' ? selectedLocation.lng.toFixed(4) : 
                    (typeof selectedLocation.longitude === 'number' ? selectedLocation.longitude.toFixed(4) : '?')}`
                ) : currentLocation ? (
                  `${typeof currentLocation.lat === 'number' ? currentLocation.lat.toFixed(4) : 
                    (typeof currentLocation.latitude === 'number' ? currentLocation.latitude.toFixed(4) : '?')}, 
                   ${typeof currentLocation.lng === 'number' ? currentLocation.lng.toFixed(4) : 
                    (typeof currentLocation.longitude === 'number' ? currentLocation.longitude.toFixed(4) : '?')} (Current)`
                ) : (
                  'No location selected'
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Type</label>
              <div className="report-type-selector">
                {['unsafe', 'suspicious', 'incident', 'safe'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={reportType === type ? `selected ${type}` : type}
                    onClick={() => setReportType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Severity <span className="severity-value">{reportSeverity}/5</span></label>
              <input
                type="range"
                min="1"
                max="5"
                value={reportSeverity}
                onChange={(e) => setReportSeverity(parseInt(e.target.value, 10))}
                className="severity-slider"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe what you observed..."
                rows="3"
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowReportForm(false)} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={reportStatus === 'submitting'}>
                {reportStatus === 'submitting' ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ReportHandler;