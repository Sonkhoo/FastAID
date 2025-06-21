/*
1. request location permissions
2. get user location
3. update driver location in database
*/
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../supabase';

export const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to book an ambulance.');
        return false;
      }
      return true;
    }

export const getUserLocation = async (status: boolean) => {

    if (!status) {
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);
    return { latitude, longitude };
}

