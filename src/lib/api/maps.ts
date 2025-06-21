/*
1. get nearest ambulance
2. get nearest hospital
3. get route between user and nearest ambulance
4. get ETA for the nearest ambulance
5. get address from coordinates
*/
import axios from 'axios';
import { supabase } from '../supabase';

// Interface for hospital data
export interface Hospital {
    id: number;
    type: string;
    name: string;
    amenity: string;
    distance: number;
    distanceText: string;
    location: {
        latitude: number;
        longitude: number;
    };
    address: string;
    phone: string;
    website: string;
    emergency: boolean;
    speciality: string;
}

export const getNearestAmbulance = async (latitude: number, longitude: number) => {
    console.log('Getting nearest ambulance...', latitude, longitude);

    let { data, error } = await supabase.rpc('nearby_available_ambulance', {
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
        phoneNumber: nearestAmbulance.phoneNumber,
        driverLicense: nearestAmbulance.driverLicense,
        location: {
            latitude: nearestAmbulance.lat,
            longitude: nearestAmbulance.long
        },
        distance: nearestAmbulance.dist_meters
    };
};

export const getNearestHospital = async (latitude: number, longitude: number): Promise<Hospital[]> => {
    try {
        console.log('Fetching nearby hospitals...', latitude, longitude);
        
        const query = `
[out:json];
(
  node["amenity"="hospital"](around:2000,${latitude},${longitude});
  way["amenity"="hospital"](around:2000,${latitude},${longitude});
  relation["amenity"="hospital"](around:2000,${latitude},${longitude});

  node["amenity"="clinic"](around:2000,${latitude},${longitude});
  way["amenity"="clinic"](around:2000,${latitude},${longitude});
  relation["amenity"="clinic"](around:2000,${latitude},${longitude});

  node["amenity"="pharmacy"](around:2000,${latitude},${longitude});
  way["amenity"="pharmacy"](around:2000,${latitude},${longitude});
  relation["amenity"="pharmacy"](around:2000,${latitude},${longitude});
);
out center;`;

        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Overpass API response:', data);

        if (!data.elements || data.elements.length === 0) {
            console.log('No hospitals found nearby');
            return [];
        }

        // Process and format the hospital data
        const hospitals = data.elements.map((element: any) => {
            // Calculate distance from user location
            let hospitalLat, hospitalLon;
            
            if (element.type === 'node') {
                hospitalLat = element.lat;
                hospitalLon = element.lon;
            } else if (element.center) {
                hospitalLat = element.center.lat;
                hospitalLon = element.center.lon;
            } else {
                // Skip elements without coordinates
                return null;
            }

            // Calculate distance using Haversine formula
            const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLon);
            
            return {
                id: element.id,
                type: element.type,
                name: element.tags?.name || 'Unknown Hospital',
                amenity: element.tags?.amenity || 'hospital',
                distance: distance,
                distanceText: formatDistance(distance),
                location: {
                    latitude: hospitalLat,
                    longitude: hospitalLon
                },
                address: element.tags?.['addr:street'] || '',
                phone: element.tags?.phone || '',
                website: element.tags?.website || '',
                emergency: element.tags?.emergency === 'yes',
                speciality: getSpecialityFromTags(element.tags)
            };
        }).filter(Boolean) as Hospital[]; // Remove null elements and type as Hospital[]

        // Sort by distance and return the nearest ones
        hospitals.sort((a: Hospital, b: Hospital) => a.distance - b.distance);
        
        console.log('Processed hospitals:', hospitals);
        return hospitals.slice(0, 4); // Return top 4r nearest

    } catch (error) {
        console.error('Error fetching nearby hospitals:', error);
        return [];
    }
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
};

// Helper function to format distance
const formatDistance = (distance: number): string => {
    if (distance < 1) {
        return `${Math.round(distance * 1000)}m`;
    } else {
        return `${distance.toFixed(1)}km`;
    }
};

// Helper function to determine speciality from tags
const getSpecialityFromTags = (tags: any): string => {
    if (tags?.emergency === 'yes') {
        return 'Emergency Care';
    } else if (tags?.amenity === 'clinic') {
        return 'General Clinic';
    } else if (tags?.amenity === 'pharmacy') {
        return 'Pharmacy';
    } else if (tags?.healthcare) {
        return tags.healthcare;
    } else {
        return 'General Hospital';
    }
};

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


