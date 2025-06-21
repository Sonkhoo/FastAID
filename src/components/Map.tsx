import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { supabase } from '../lib/supabase';
import { getNearestAmbulance, getRouteToAmbulance, RouteCoordinate } from '../lib/api/maps';
import { getUserLocation } from '../lib/services/location';

interface Coordinate {
    latitude: number;
    longitude: number;
}

interface Ambulance {
    id: string;
    name: string;
    location: Coordinate;
    is_available: boolean;
}

interface MapContainerProps {
    latitude: number;
    longitude: number;
}

const MapContainer = ({ latitude, longitude }: MapContainerProps) => {
    const [nearestAmbulance, setNearestAmbulance] = useState<Ambulance | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
    const [region, setRegion] = useState({
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
    });
    
    // Fetch nearest ambulance when component mounts
    useEffect(() => {
        const fetchNearestAmbulanceData = async () => {
            try {
                const ambulance = await getNearestAmbulance(latitude, longitude);
                if (ambulance) {
                    setNearestAmbulance(ambulance);
                
                    // Fetch route when we have both user location and ambulance location
                    const userLocation= await getUserLocation(true);
                    if (!userLocation) {
                        Alert.alert('Location not available', 'Please enable location services and try again.');
                        return;
                    }
                    console.log("User coordinates: ", userLocation.latitude, userLocation.longitude)
                    const ambulanceCoords = { 
                        lat: ambulance.location.latitude, 
                        lng: ambulance.location.longitude 
                    };
                    console.log("Ambulance coordinates: ", ambulanceCoords);
                    
                
                    const route = await getRouteToAmbulance({lat: userLocation.latitude, lng: userLocation.longitude}, ambulanceCoords);
                    if (route) {
                        console.log("Route coordinates: ", route);
                        setRouteCoordinates(route);
                    }
                }
            } catch (error) {
                console.error('Error fetching nearest ambulance:', error);
            }
        };

        fetchNearestAmbulanceData();

        // Set up real-time subscription to drivers table
        const channel = supabase
            .channel('driver_locations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'driver',
                },
                (payload: any) => {
                    // When a driver's location updates, refetch the nearest ambulance
                    console.log('Driver location updated:', payload);
                    fetchNearestAmbulanceData();
                }
            )
            .subscribe();

        // Clean up subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [latitude, longitude]);

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {nearestAmbulance && (
                    <Marker
                        coordinate={nearestAmbulance.location}
                        title="Nearest Ambulance"
                        description={nearestAmbulance.name || 'Ambulance'}
                        image={require('../../assets/images/ambulance.png')}
                    />
                )}
                
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor="#FF0000" // Red color for the route
                        strokeWidth={4}
                    />
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: 400,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default MapContainer;