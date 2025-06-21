/*
1. get nearest ambulance
2. get nearest hospital
3. get route between user and nearest ambulance
4. get ETA for the nearest ambulance
5. get address from coordinates
*/
import axios from 'axios';
import { supabase } from '../supabase';
export const getNearestAmbulance = async (latitude: number, longitude: number) => {
    console.log('Getting nearest ambulance...', latitude, longitude);

    let { data, error } = await supabase.rpc('nearby_ambulance', {
        latitude_param: latitude,
        longitude_param: longitude
    });
  
    if (error) {
        console.error('Error getting nearest ambulance:', error);
        return null;
    }

    if (!data || data.length === 0) {
        console.log('No available ambulances found');
        return null;
    }

    const nearestAmbulance = data[0];  // Get the first (and only) result
    console.log('Nearest ambulance:', nearestAmbulance);
    
    return {
        id: nearestAmbulance.id,
        name: nearestAmbulance.name,
        location: {
            latitude: nearestAmbulance.lat,
            longitude: nearestAmbulance.long
        },
        distance: nearestAmbulance.dist_meters
    };
};

export const getNearestHospital = async (latitude: number, longitude: number) => {
    const {data, error} = await supabase.rpc('nearby_hospital', {
        latitude_param: latitude,
        longitude_param: longitude
        });
  
        if (error) {
          console.error('Error getting nearest hospital:', error);
          return;
        }
        console.log('Nearest hospital:', data[0]);
        return data[0];
}


export interface RouteCoordinate {
    latitude: number;
    longitude: number;
}

export const getRouteToAmbulance = async (
    userLocation: { lat: number, lng: number }, 
    ambulanceLocation: { lat: number, lng: number }
)=> {
    try {

        console.log('User location:', userLocation);
        console.log('Ambulance location:', ambulanceLocation);
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/` +
            `${userLocation.lng},${userLocation.lat};${ambulanceLocation.lng},${ambulanceLocation.lat}?overview=full&geometries=geojson`
        );
        
        const data = await response.json();
        console.log('Route data:', data);
        
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.error('No route found');
            return null;
        }

        // Convert GeoJSON coordinates to {latitude, longitude} format
        const coordinates = data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0]
        }));

        return coordinates;
    } catch (error) {
        console.error('Error fetching route:', error);
        return null;
    }
};

export const getETAForAmbulance = async (userLocation: { lat: number, lng: number }, ambulanceLocation: { lat: number, lng: number }) => {
    try {
        const OLA_API_KEY = process.env.EXPO_PUBLIC_OLA_API_KEY;
        if (!OLA_API_KEY) {
            console.error('EXPO_PUBLIC_OLA_API_KEY is not defined in environment variables');
            return null;
        }

        console.log('User location:', userLocation);
        console.log('Ambulance location:', ambulanceLocation);
        const options = {
            method: 'GET',
            url: 'https://api.olamaps.io/routing/v1/distanceMatrix/basic',
            params: {
                api_key: OLA_API_KEY,
                origins: `${userLocation.lat},${userLocation.lng}`,
                destinations: `${ambulanceLocation.lat},${ambulanceLocation.lng}`,
                mode: 'driving',
                traffic_model: 'pessimistic',
                departure_time: 'now'
            }
        };
          
        const { data } = await axios.request(options);
        console.log('API Response:', data);
        
        // Extract the first element from the response
        const element = data.rows[0]?.elements[0];
        
        if (!element) {
            console.error('No route found between the points');
            return null;
        }
        
        console.log('ETA for ambulance:', element);
        return {
            duration: element.duration, // Duration in seconds
            distance: element.distance, // Distance in meters
            status: element.status
        };
    } catch (error) {
        console.error('Error getting ETA:', error);
        return null;
    }
};



export const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    
};


