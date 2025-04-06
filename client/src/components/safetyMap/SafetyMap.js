import React, { useState, useRef } from 'react';
import MapContainer from './MapContainer';
import ReportHandler from './ReportHandler';
import SocketHandler from './SocketHandler';
import './SafetyMap.css';

// we are initilaizing different functioning using react hooks
const SafetyMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [safetyData, setSafetyData] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);

//since this SafetyMap.js is a main file for map feature so we are importing other function from 
  return ( //differnet files present in the safet map folder
    <div className="safety-map-container">
      <MapContainer
        mapRef={mapRef}
        map={map}
        setMap={setMap}
        currentLocation={currentLocation}
        setCurrentLocation={setCurrentLocation}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        setLoadingLocation={setLoadingLocation}
        setErrorMessage={setErrorMessage}
        setStatusMessage={setStatusMessage}
        markers={markers}
        routes={routes}
      />
      

      <ReportHandler //taking more features from ReportHandler file present in SafetMap folder
        map={map}
        currentLocation={currentLocation}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation} // Add this prop
        safetyData={safetyData}
        setSafetyData={setSafetyData}
        markers={markers}
        setMarkers={setMarkers}
        setErrorMessage={setErrorMessage}
        setStatusMessage={setStatusMessage}
      />
      
      <SocketHandler //As we connect backend from frontend using socket so related that that all code is 
        map={map} //is present in this file so basically taking features from Socket Handler file  
        currentLocation={currentLocation} //present in SocketMap folder
        setSafetyData={setSafetyData}
        setMarkers={setMarkers}
        setErrorMessage={setErrorMessage}
        setStatusMessage={setStatusMessage}
      />
    



      {errorMessage && ( //calling error message here only declared error message in different files 
        <div className="error-message">      //as its the main file for map features
          <div className="error-icon">⚠️</div>
          <div>{errorMessage}</div> 
        </div>
      )}

      {statusMessage && (  //we are calling status message setup in different files because there //can be different status message such as server is online //model is initialized etc.
        <div className="status-message"> 
          {statusMessage} 
        </div>
      )}
    </div>

  );
};
//to export all safety map features throughout the project we write this expot line 
export default SafetyMap;