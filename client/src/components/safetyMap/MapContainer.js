import React, { useEffect, useCallback, useState } from 'react';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY; //setting up API of google

const MapContainer = ({ //initializing different functions and setting up states using React hooks
  mapRef,
  map,
  setMap,
  currentLocation,
  setCurrentLocation,
  selectedLocation,
  setSelectedLocation,
  setLoadingLocation,
  setErrorMessage,
  setStatusMessage,
  markers,
  routes
}) => {
  const [locationAttempts, setLocationAttempts] = useState(0);
  const MAX_LOCATION_ATTEMPTS = 3; //as we use Geo Loccation is API to find current location so 
                                  //it will try to find current location of user at max 3 times

  //get location function finds current location using Geo Location API so we use useCallBack react
 //hook to initialize our getLocation function and geo Location.getCurrentPosition is part of 
  const getLocation = useCallback(() => { //Geo location API to fetch exact current location of user
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords; //converting to coordinates
          resolve({ lat: latitude, lng: longitude }); //giving alias for latitude and longitude
        },
        error => { //if we are not able to fetch the current location then it sends an error
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 3000000, maximumAge: 0 }
      );
    });
  }, []);

  //we are initializing the map 
  const initMap = useCallback(async () => {
    setLoadingLocation(true);
    
    try {
      // Try to get location from getLocation function which we have mentioned earlier and then put 
      const position = await getLocation(); //that location in position 
      setCurrentLocation(position);
      setLoadingLocation(false);
      setLocationAttempts(0); // Reset attempts on success
      
      //we are setting up the google map in our website with following features
      if (!map) {
        const googleMap = new window.google.maps.Map(mapRef.current, {
          center: position,
          zoom: 14,
          styles: [
            { featureType: 'all', elementType: 'geometry.fill', stylers: [{ color: '#1a1a2e' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#4777fe' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0f3460' }] },
          ],
          disableDefaultUI: true,
          gestureHandling: 'greedy', //as we can access map using any of gestures (touch or phone)
          zoomControl: true,
        });
        setMap(googleMap);

        //when we select a location that location coordinate is selected so this function basically we do 
        googleMap.addListener('click', (event) => {
          const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          setSelectedLocation(latLng);
          setStatusMessage(`Selected: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
          setTimeout(() => setStatusMessage(''), 3000);
        });
      } else {
        map.panTo(position);
      }
      
      //setting up location each time when we browse to different places in map
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          if (map) map.panTo({ lat: latitude, lng: longitude });
        },
        (error) => { //if we are not able to fetch location at different position so we send error
          console.warn('Watch position error:', error.message); //message 
          // Don't show error for watch updates
        },
        { enableHighAccuracy: true, timeout: 3000000, maximumAge: 10000 }
      );
        return watchId;

      } catch (error) { //location is not able to get fetched
      console.error('Location error:', error);
      
      // Increment attempts and try again if under max attempts
      const newAttempts = locationAttempts + 1;
      setLocationAttempts(newAttempts);
      
      if (newAttempts < MAX_LOCATION_ATTEMPTS) { //if attempts are less than max attempts
        setErrorMessage(`Location error: ${error.message}. Retrying (${newAttempts}/${MAX_LOCATION_ATTEMPTS})...`);
        
        // Wait 2 seconds before retrying for next attempt
        setTimeout(() => {
          initMap(); //start retrying to load the map again and to find current location
        }, 2000);
      } else {
        // Use default location after max attempts is taken to find current location 
        setErrorMessage(`Location error: ${error.message}. Using default location.`);
        setLoadingLocation(false);
        
        const defaultLocation = { lat: 37.7749, lng: -122.4194 }; //so we show default location
        setCurrentLocation(defaultLocation);

        if (!map) { //if real time feature of location is not working then show area near default location
          const googleMap = new window.google.maps.Map(mapRef.current, {
            center: defaultLocation,
            zoom: 14,
            styles: [
              { featureType: 'all', elementType: 'geometry.fill', stylers: [{ color: '#1a1a2e' }] },
              { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#4777fe' }] },
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0f3460' }] },
            ],
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            zoomControl: true,
          });
          setMap(googleMap);
          
          //to select particular location to report the incident
          googleMap.addListener('click', (event) => {
            const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
            setSelectedLocation(latLng);
            setStatusMessage(`Selected: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
            setTimeout(() => setStatusMessage(''), 3000);
          });
        }
      }
    } //this are parameters present in init map function which we have separated and put into React hook
    //use call back for later use throughout the project (means if we use useCallback hook this parametes will be called in different files for later use)
  }, [map, mapRef, setMap, setCurrentLocation, setLoadingLocation, setErrorMessage, setSelectedLocation, setStatusMessage, getLocation, locationAttempts]);

  // Add this to the MapContainer component after initializing the map
useEffect(() => {
  if (map && currentLocation) {
    // Create or update current location marker (basically it ie represented in map as blue color)
    const createLocationMarker = () => {
      //Clear existing marker if any as location will be only shown once fetched 
      if (window.currentLocationMarker) {
        window.currentLocationMarker.setMap(null);
      }
      
      // Create new marker (new marker will have this features with it)
      window.currentLocationMarker = new window.google.maps.Marker({
        position: currentLocation,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: 'Your Location',
        zIndex: 1000 //this basically show current location marker(blue color) in 3-D format 
      });
      
      // Add accuracy circle basically white boundary around blue marker(current location)
      if (window.locationAccuracyCircle) {
        window.locationAccuracyCircle.setMap(null);
      }
      
      window.locationAccuracyCircle = new window.google.maps.Circle({
        map: map,
        center: currentLocation,
        radius: 50, // 50 meters accuracy
        strokeColor: '#4285F4',
        strokeOpacity: 0.2,
        strokeWeight: 1,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
      });
    };
    
    createLocationMarker(); //this function get called to make current location marker
  }
}, [map, currentLocation]);

  useEffect(() => {
    let watchId;
    
    const loadGoogleMaps = () => { //to ensure link is correct and google map API is setup or not
      if (!window.google && GOOGLE_MAPS_API_KEY) { //so we are fetching google maps API basically 
        const script = document.createElement('script'); //script is taken from given link
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.onload = async () => {
          watchId = await initMap(); //we wait till google maop is loaded in project and then we 
        }; //intialized the map
        script.onerror = () => { //if not able to load the map then we give the error message
          setErrorMessage('Failed to load Google Maps.');
          setLoadingLocation(false);
        };
        document.head.appendChild(script); //basically adds google API script file to our local project
      } else if (window.google) {
        initMap().then(id => {
          watchId = id; // we are checking for if the google maps javascript api is loaded or not
        });
      } else { // if our key was not set up perfectly then the following error shows up
        setErrorMessage('Google Maps API key is missing.');
        setLoadingLocation(false);
      }
    };

    loadGoogleMaps();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId); // firstly there is no watch id present, but once we use geolocation feature then we need to have a watch id (after once the location changes), the watch id thing comes automatically via that api (geolocation)
      
      if (markers && markers.length) {// keeping the marker(blue dot of current location) null at the start after setting up the google map 
        markers.forEach(marker => {
          if (marker && marker.setMap) marker.setMap(null);
        });
      }
      
      if (routes && routes.length) {
        routes.forEach(route => {
          if (route && route.setMap) route.setMap(null);
        });
      }
    };
  }, [initMap, markers, routes, setErrorMessage, setLoadingLocation]);

  // Add a manual refresh button once the user exceeds the maximum limit of finding the current location
  const handleRefreshLocation = useCallback(() => {
    setLocationAttempts(0);
    initMap();
  }, [initMap]);
        
  return ( // here the button shows up when we exceed the maximum limit of finding the current location basically it helps us to know that the current location was not being able to get fetched and we need to refresh the website in order to proceed, to show up the current location means again we try to find the current location again we get 3 attempts after refreshing (fresh start)
    <>
      <div ref={mapRef} className="map" style={{ width: '100%', height: '100vh' }}></div>
      {locationAttempts >= MAX_LOCATION_ATTEMPTS && (
        <button 
          onClick={handleRefreshLocation}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '10px 15px',
            backgroundColor: '#4777fe',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          Retry Location
        </button>
      )}
    </>
  );
};
//to use the map cotainer and its constituents throughout the website we use this export line of code
export default MapContainer;
