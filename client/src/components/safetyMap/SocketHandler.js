import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SocketHandler = ({
  map,
  currentLocation,
  setSafetyData,
  setMarkers,
  setErrorMessage,
  setStatusMessage
}) => {
  const socketRef = useRef(null);

  const addReportMarker = (googleMap, report) => {
    const markerColor = report.type === 'safe' ? '#22c55e' : report.type === 'suspicious' ? '#f97316' : '#ef4444';
    const marker = new window.google.maps.Marker({
      position: report.location,
      map: googleMap,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: markerColor,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 1,
      },
      title: report.description,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color: #fff; background: ${markerColor}; padding: 8px; border-radius: 5px;">
          <div style="font-weight: 600">${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Area</div>
          <div>${report.description}</div>
          <div style="font-size: 0.85em">Reported: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>`,
    });

    marker.addListener('click', () => infoWindow.open(googleMap, marker));
    return marker;
  };

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      setErrorMessage('');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setErrorMessage('Could not connect to safety server. Retrying...');
    });

    socketRef.current.on('safetyUpdate', (newReport) => {
      console.log('Received safety update:', newReport);
      setSafetyData((prev) => {
        const exists = prev.some(report => report._id === newReport._id);
        if (exists) return prev;
        return [...prev, newReport];
      });

      if (map) {
        const newMarker = addReportMarker(map, newReport);
        setMarkers(prev => [...prev, newMarker]);
        setStatusMessage(`New safety report: ${newReport.description}`);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    });

    socketRef.current.on('ping', () => {
      socketRef.current.emit('pong');
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [map, setSafetyData, setMarkers, setErrorMessage, setStatusMessage]);

  return null;
};

export default SocketHandler;