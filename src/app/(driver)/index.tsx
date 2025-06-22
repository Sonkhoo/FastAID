import {
  CheckCircle,
  DollarSign,
  MapPin,
  Navigation,
  User,
  XCircle
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapContainer from '../../components/Map';

const styles = StyleSheet.create({
    container: {
      flex: 1,
      height: 300,
    },
    map: {
      width: '100%',
      height: '100%',
    },
});

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const driver = {
    name: 'John Doe',
    rating: 4.8,
  };

  const newBooking = {
    id: 'B789',
    userName: 'Jane Smith',
    pickup: '123 Main St, Cityville',
    destination: '456 Oak Ave, Townburg',
    fare: 25.50,
    eta: '5 min',
  };

  const pastBookings = [
    { id: 'B123', date: '2024-06-18', fare: 32.00, status: 'completed' },
    { id: 'B456', date: '2024-06-18', fare: 15.75, status: 'completed' },
    { id: 'B788', date: '2024-06-17', fare: 22.00, status: 'cancelled' },
  ];

  const totalEarnings = pastBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.fare, 0);

  const defaultLocation = {
    latitude: 37.78825,
    longitude: -122.4324,
  };

  const renderBookingRequest = () => (
    <View className="bg-white rounded-2xl p-5 mx-4 my-4 shadow-lg border border-gray-100">
      <Text className="text-xl font-bold text-gray-900 mb-2">New Ride Request</Text>
      <View className="flex-row items-center mb-3">
        <User size={18} color="#4b5563" />
        <Text className="text-lg text-gray-800 ml-2 font-semibold">{newBooking.userName}</Text>
      </View>
      <View className="space-y-2 mb-4">
        <View className="flex-row items-start">
          <MapPin size={16} color="#16a34a" className="mt-1" />
          <Text className="text-gray-700 ml-2 flex-1">From: {newBooking.pickup}</Text>
        </View>
        <View className="flex-row items-start">
          <MapPin size={16} color="#dc2626" className="mt-1" />
          <Text className="text-gray-700 ml-2 flex-1">To: {newBooking.destination}</Text>
        </View>
      </View>
      <View className="flex-row justify-between items-center border-t border-gray-100 pt-3">
        <View>
            <Text className="text-gray-600">ETA: {newBooking.eta}</Text>
            <Text className="text-xl font-bold text-green-600">${newBooking.fare.toFixed(2)}</Text>
        </View>
        <View className="flex-row space-x-3">
          <TouchableOpacity className="bg-red-100 p-3 rounded-full">
            <XCircle size={24} color="#dc2626" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-green-100 p-3 rounded-full">
            <CheckCircle size={24} color="#16a34a" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderRideDetails = () => (
    <View>
        <View className="p-4 mx-4 bg-white rounded-xl mt-4">
            <Text className="font-bold text-lg">Active Ride</Text>
            <Text className="text-gray-600 mt-2">You are currently on a trip to {newBooking.destination}.</Text>
        </View>
    </View>
  );

  const renderBookingHistory = () => (
    <View className="px-4 mt-4">
      {pastBookings.map(booking => (
        <View key={booking.id} className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row justify-between items-center">
          <View>
            <Text className="font-semibold text-gray-800">Booking #{booking.id}</Text>
            <Text className="text-gray-500 text-sm">{booking.date}</Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-lg text-gray-900">${booking.fare.toFixed(2)}</Text>
            <View className="flex-row items-center mt-1">
                {booking.status === 'completed' 
                    ? <CheckCircle size={16} color="#16a34a" /> 
                    : <XCircle size={16} color="#dc2626" />
                }
                <Text className={`text-sm ml-1 font-medium ${booking.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />
      
      <View className="bg-white flex-row items-center justify-between px-4 py-3 shadow-sm">
        <View>
          <Text className="text-xl font-bold text-gray-800">Welcome, {driver.name}</Text>
          <Text className="text-gray-500">Rating: {driver.rating} ★</Text>
        </View>
        <View className="flex-row items-center">
          <Text className={`font-semibold mr-2 ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isOnline ? "#16a34a" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setIsOnline(previousState => !previousState)}
            value={isOnline}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container} className="bg-gray-300">
            <MapContainer 
              latitude={defaultLocation.latitude} 
              longitude={defaultLocation.longitude} 
            />
            <View className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg">
              <Navigation color="#1f2937" size={22} />
            </View>
        </View>

        {isOnline && renderBookingRequest()}

        <View className="flex-row justify-around p-4 bg-white mt-[-10] mx-4 rounded-xl shadow-md z-10 relative">
            <View className="items-center">
                <DollarSign size={24} color="#16a34a" />
                <Text className="text-xl font-bold text-gray-800 mt-1">${totalEarnings.toFixed(2)}</Text>
                <Text className="text-gray-500">Total Earnings</Text>
            </View>
            <View className="items-center">
                <CheckCircle size={24} color="#3b82f6" />
                <Text className="text-xl font-bold text-gray-800 mt-1">{pastBookings.filter(b => b.status === 'completed').length}</Text>
                <Text className="text-gray-500">Total Trips</Text>
            </View>
        </View>

        <View className="flex-row bg-white p-1 rounded-full mx-4 mt-6">
            <TouchableOpacity 
                onPress={() => setActiveTab('details')}
                className={`flex-1 p-3 rounded-full items-center justify-center ${activeTab === 'details' ? 'bg-blue-500' : 'bg-white'}`}
            >
                <Text className={`font-bold ${activeTab === 'details' ? 'text-white' : 'text-blue-500'}`}>Active Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={() => setActiveTab('history')}
                className={`flex-1 p-3 rounded-full items-center justify-center ${activeTab === 'history' ? 'bg-blue-500' : 'bg-white'}`}
            >
                <Text className={`font-bold ${activeTab === 'history' ? 'text-white' : 'text-blue-500'}`}>Booking History</Text>
            </TouchableOpacity>
        </View>

        {activeTab === 'details' ? renderRideDetails() : renderBookingHistory()}

      </ScrollView>
    </SafeAreaView>
  );
}