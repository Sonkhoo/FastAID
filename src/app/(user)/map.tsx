import {
  Filter,
  Hospital,
  MapPin,
  Navigation,
  Search,
  Truck
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapContainer from '../../components/Map';
import { getETAForAmbulance, getNearestAmbulance } from '../../lib/api/maps';
import { getUserLocation } from '../../lib/services/location';

// TypeScript interfaces
interface AmbulanceData {
  id: string;
  distance: string;
  eta: string;
  status: string;
  driver: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function MapScreen() {
  // State for user location
  const [defaultLocation, setDefaultLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });

  // State for nearby ambulances
  const [nearbyAmbulances, setNearbyAmbulances] = useState<AmbulanceData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user location and nearest ambulance on component mount
  useEffect(() => {
    const fetchLocationAndAmbulance = async () => {
      try {
        // Get user location
        const userLocation = await getUserLocation(true);
        if (userLocation) {
          setDefaultLocation(userLocation);
          console.log("User location:", userLocation.latitude, userLocation.longitude);
        }

        // Fetch nearest ambulance
        setLoading(true);
        const ambulance = await getNearestAmbulance(
          userLocation?.latitude || defaultLocation.latitude, 
          userLocation?.longitude || defaultLocation.longitude
        );
        
        if (ambulance) {
          // Get ETA for the ambulance
          let etaText = 'Calculating...';
          try {
            const etaData = await getETAForAmbulance(
              { lat: userLocation?.latitude || defaultLocation.latitude, lng: userLocation?.longitude || defaultLocation.longitude },
              { lat: ambulance.location.latitude, lng: ambulance.location.longitude }
            );
            console.log("ETAAAAAJUNAHANAAAAAAAAAAAAAAAAAAAAAAAAAAA:", etaData);
            
            if (etaData && etaData.duration) {
              const minutes = Math.ceil(etaData.duration / 60);
              etaText = `${minutes} min`;
              console.log("ETAAAAAJUNAHANAAAAAAAAAAAAAAAAAAAAAAAAAAA:", etaText);
            }
          } catch (etaError) {
            console.error('Error calculating ETA:', etaError);
            etaText = 'N/A';
          }

          // Convert the ambulance data to match the UI format
          const ambulanceData: AmbulanceData = {
            id: ambulance.id,
            distance: `${(ambulance.distance / 1000).toFixed(1)} km`,
            eta: etaText,
            status: 'Available',
            driver: ambulance.name,
            location: ambulance.location
          };
          setNearbyAmbulances([ambulanceData]);
        } else {
          setNearbyAmbulances([]);
        }
      } catch (error) {
        console.error('Error fetching nearest ambulance:', error);
        setNearbyAmbulances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationAndAmbulance();
  }, []);

  const nearbyHospitals = [
    { id: 1, name: 'City General Hospital', distance: '2.3 km', speciality: 'Emergency Care' },
    { id: 2, name: 'Metro Medical Center', distance: '3.1 km', speciality: 'Trauma Center' },
    { id: 3, name: 'Downtown Clinic', distance: '1.8 km', speciality: 'Urgent Care' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      width: '100%',
      height: '100%',
    },
  });

  const Map = React.useMemo(() => {
    if (Platform.OS === 'web') {
      return React.lazy(() => import('../../components/Map'));
    }
    return () => null;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Live Map</Text>
          <View className="flex-row">
            <TouchableOpacity className="bg-gray-100 p-2 rounded-full mr-2">
              <Search color="#6B7280" size={20} />
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 p-2 rounded-full">
              <Filter color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Map Container */}
        <View style={styles.container}>
          <MapContainer 
            latitude={defaultLocation.latitude} 
            longitude={defaultLocation.longitude} 
          />
          <View className="absolute top-4 left-4 bg-white p-3 rounded-full shadow">
            <Navigation color="#DC2626" size={20} />
          </View>
          <View className="absolute bottom-4 right-4 bg-primary-500 px-4 py-2 rounded-full">
            <Text className="text-white font-semibold">Your Location</Text>
          </View>
          
          {/* Ambulance markers */}
          <View className="absolute top-1/4 left-1/3 bg-accent-500 p-2 rounded-full">
            <Truck color="white" size={16} />
          </View>
          <View className="absolute top-1/2 right-1/4 bg-accent-500 p-2 rounded-full">
            <Truck color="white" size={16} />
          </View>
          
          {/* Hospital marker */}
          <View className="absolute top-1/3 right-1/3 bg-secondary-500 p-2 rounded-full">
            <Hospital color="white" size={16} />
          </View>
        </View>

        {/* Location Controls */}
        <View className="flex-row px-6 mt-4 space-x-3">
          <TouchableOpacity className="flex-1 bg-red-500 py-3 rounded-xl">
            <Text className="text-white font-bold text-center">Book Nearest Ambulance</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white border border-gray-300 px-4 py-3 rounded-xl">
            <MapPin color="#DC2626" size={20} />
          </TouchableOpacity>
        </View>

        {/* Nearby Ambulances */}
        <View className="px-6 mt-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Nearby Ambulances</Text>
          {loading ? (
            <View className="bg-white p-4 rounded-xl mb-3 shadow-sm">
              <Text className="text-gray-600 text-center">Loading ambulances...</Text>
            </View>
          ) : nearbyAmbulances.length > 0 ? (
            nearbyAmbulances.map((ambulance) => (
              <View key={ambulance.id} className="bg-white p-4 rounded-xl mb-3 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className={`w-3 h-3 rounded-full mr-3 ${
                      ambulance.status === 'Available' ? 'bg-accent-500' : 'bg-orange-500'
                    }`} />
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900">Driver: {ambulance.driver}</Text>
                      <Text className="text-gray-600 text-sm">
                        {ambulance.distance} away • ETA {ambulance.eta}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    className={`px-4 py-2 rounded-full ${
                      ambulance.status === 'Available' 
                        ? 'bg-accent-500' 
                        : 'bg-gray-300'
                    }`}
                    disabled={ambulance.status !== 'Available'}
                  >
                    <Text className={`font-semibold ${
                      ambulance.status === 'Available' ? 'text-white' : 'text-gray-500'
                    }`}>
                      {ambulance.status === 'Available' ? 'Book' : 'Busy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white p-4 rounded-xl mb-3 shadow-sm">
              <Text className="text-gray-600 text-center">No ambulances available nearby</Text>
            </View>
          )}
        </View>

        {/* Nearby Hospitals */}
        <View className="px-6 mt-6 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Nearby Hospitals</Text>
          {nearbyHospitals.map((hospital) => (
            <View key={hospital.id} className="bg-white p-4 rounded-xl mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 mb-1">{hospital.name}</Text>
                  <Text className="text-gray-600 text-sm mb-1">{hospital.speciality}</Text>
                  <View className="flex-row items-center">
                    <MapPin color="#6B7280" size={16} />
                    <Text className="text-gray-600 text-sm ml-1">{hospital.distance} away</Text>
                  </View>
                </View>
                <TouchableOpacity className="bg-secondary-500 px-4 py-2 rounded-full">
                  <Text className="text-white font-semibold">Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

