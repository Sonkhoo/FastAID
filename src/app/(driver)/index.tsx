import { router } from 'expo-router';
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  LogOut,
  MapPin,
  Navigation,
  User,
  XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
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
import { useAuth } from '../../contexts/AuthContext';
import {
  acceptBooking,
  completeBooking,
  getDriverBookingHistory,
  getPendingBookingsForDriver,
  rejectBooking,
  updateDriverAvailability
} from '../../lib/api/booking';
import { getCurrentDriverProfile } from '../../lib/api/user';
import { supabase } from '../../lib/supabase';

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

interface Booking {
  id: string;
  created_at: string;
  estimatedCost: string;
  estimatedTime: string;
  bookingStatus: string;
  paymentStatus?: boolean;
  userId: string;
  hospital: any;
  User: {
    id: string;
    name: string;
    phoneNumber: string;
  } | null;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 22.654885900941647,
    longitude: 88.37130670753086,
  });

  // Fetch driver profile and data
  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      // Get driver profile
      const driverProfile = await getCurrentDriverProfile();
      if (driverProfile) {
        setDriver(driverProfile);
        setIsOnline(driverProfile.isAvailable);
        setCurrentLocation({
          latitude: driverProfile.latitude || 22.654885900941647,
          longitude: driverProfile.longitude || 88.37130670753086,
        });

        // Get pending bookings
        const pending = await getPendingBookingsForDriver(driverProfile.id);
        const transformedPending = pending.map((booking: any) => ({
          ...booking,
          User: Array.isArray(booking.User) ? booking.User[0] : booking.User
        }));
        setPendingBookings(transformedPending as Booking[]);
        
        const history = await getDriverBookingHistory(driverProfile.id);
        const transformedHistory = history.map((booking: any) => ({
          ...booking,
          User: Array.isArray(booking.User) ? booking.User[0] : booking.User
        }));
        setBookingHistory(transformedHistory as Booking[]);
      } else {
        // No driver profile found - this shouldn't happen for authenticated drivers
        console.log('No driver profile found - user may not be a driver');
        setDriver(null);
        setPendingBookings([]);
        setBookingHistory([]);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setDriver(null);
      setPendingBookings([]);
      setBookingHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!driver?.id) return;

    // Subscribe to booking changes for this driver
    const bookingChannel = supabase
      .channel('driver_bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Booking',
          filter: `driverId=eq.${driver.id}`,
        },
        () => {
          console.log('Driver booking changed, updating data');
          fetchDriverData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [driver?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchDriverData();
  }, []);

  // Handle online/offline toggle
  const handleOnlineToggle = async (value: boolean) => {
    try {
      if (driver?.id) {
        await updateDriverAvailability(driver.id, value);
        setIsOnline(value);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  // Handle booking acceptance
  const handleAcceptBooking = async (bookingId: string) => {
    try {
      if (!driver?.id) return;
      
      await acceptBooking(bookingId, driver.id);
      Alert.alert('Success', 'Booking accepted!');
      fetchDriverData();
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking');
    }
  };

  // Handle booking rejection
  const handleRejectBooking = async (bookingId: string) => {
    try {
      await rejectBooking(bookingId);
      Alert.alert('Success', 'Booking rejected');
      fetchDriverData();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      Alert.alert('Error', 'Failed to reject booking');
    }
  };

  // Handle booking completion
  const handleCompleteBooking = async (bookingId: string) => {
    try {
      if (!driver?.id) return;
      
      await completeBooking(bookingId, driver.id);
      Alert.alert('Success', 'Booking completed!');
      fetchDriverData();
    } catch (error) {
      console.error('Error completing booking:', error);
      Alert.alert('Error', 'Failed to complete booking');
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverData();
    setRefreshing(false);
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Set driver offline before logout (if driver profile exists)
              if (driver?.id) {
                try {
                  await updateDriverAvailability(driver.id, false);
                } catch (availabilityError) {
                  console.error('Error updating driver availability during logout:', availabilityError);
                  // Continue with logout even if availability update fails
                }
              }
              
              // Sign out from auth
              await supabase.auth.signOut();
              router.replace('./(auth)/');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Calculate total earnings
  const totalEarnings = bookingHistory
    .filter(b => b.bookingStatus === 'completed' && b.paymentStatus)
    .reduce((sum, b) => sum + parseFloat(b.estimatedCost), 0);

  const renderBookingRequest = (booking: Booking) => (
    <View key={booking.id} className="bg-white rounded-2xl p-5 mx-4 my-4 shadow-lg border border-gray-100">
      <Text className="text-xl font-bold text-gray-900 mb-2">New Ride Request</Text>
      <View className="flex-row items-center mb-3">
        <User size={18} color="#4b5563" />
        <Text className="text-lg text-gray-800 ml-2 font-semibold">{booking.User?.name || 'Unknown'}</Text>
      </View>
      <View className="space-y-2 mb-4">
        <View className="flex-row items-start">
          <MapPin size={16} color="#16a34a" className="mt-1" />
          <Text className="text-gray-700 ml-2 flex-1">To: Hospital</Text>
        </View>
        <View className="flex-row items-start">
          <AlertCircle size={16} color="#dc2626" className="mt-1" />
          <Text className="text-gray-700 ml-2 flex-1">Emergency Booking</Text>
        </View>
      </View>
      <View className="flex-row justify-between items-center border-t border-gray-100 pt-3">
        <View>
            <Text className="text-gray-600">ETA: {booking.estimatedTime}</Text>
            <Text className="text-xl font-bold text-green-600">₹{booking.estimatedCost}</Text>
        </View>
        <View className="flex-row space-x-3">
          <TouchableOpacity 
            className="bg-red-100 p-3 rounded-full"
            onPress={() => handleRejectBooking(booking.id)}
          >
            <XCircle size={24} color="#dc2626" />
          </TouchableOpacity>
          <TouchableOpacity 
            className="bg-green-100 p-3 rounded-full"
            onPress={() => handleAcceptBooking(booking.id)}
          >
            <CheckCircle size={24} color="#16a34a" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActiveRide = () => {
    const activeBooking = bookingHistory.find(b => b.bookingStatus === 'accepted');
    
    if (!activeBooking) {
      return (
        <View className="p-4 mx-4 bg-white rounded-xl mt-4">
          <Text className="font-bold text-lg">No Active Ride</Text>
          <Text className="text-gray-600 mt-2">You are currently available for new bookings.</Text>
        </View>
      );
    }

    return (
      <View className="p-4 mx-4 bg-white rounded-xl mt-4">
        <Text className="font-bold text-lg">Active Ride</Text>
        <Text className="text-gray-600 mt-2">Passenger: {activeBooking.User?.name}</Text>
        <Text className="text-gray-600">Destination: Hospital</Text>
        <Text className="text-gray-600">Fare: ₹{activeBooking.estimatedCost}</Text>
        <TouchableOpacity 
          className="bg-green-500 p-3 rounded-xl mt-3"
          onPress={() => handleCompleteBooking(activeBooking.id)}
        >
          <Text className="text-white font-bold text-center">Complete Ride</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBookingHistory = () => (
    <View className="px-4 mt-4">
      {bookingHistory.length === 0 ? (
        <View className="bg-white p-4 rounded-xl mb-3 shadow-sm">
          <Text className="text-gray-500 text-center">No booking history yet</Text>
        </View>
      ) : (
        bookingHistory.map(booking => (
          <View key={booking.id} className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row justify-between items-center">
            <View>
              <Text className="font-semibold text-gray-800">Booking #{booking.id.slice(0, 8)}</Text>
              <Text className="text-gray-500 text-sm">{new Date(booking.created_at).toLocaleDateString()}</Text>
              <Text className="text-gray-500 text-sm">{booking.User?.name}</Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-lg text-gray-900">₹{booking.estimatedCost}</Text>
              <View className="flex-row items-center mt-1">
                  {booking.bookingStatus === 'completed' 
                      ? <CheckCircle size={16} color="#16a34a" /> 
                      : <AlertCircle size={16} color="#f59e0b" />
                  }
                  <Text className={`text-sm ml-1 font-medium ${
                    booking.bookingStatus === 'completed' ? 'text-green-600' : 
                    booking.bookingStatus === 'accepted' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                      {booking.bookingStatus.charAt(0).toUpperCase() + booking.bookingStatus.slice(1)}
                  </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />
      
      <View className="bg-white flex-row items-center justify-between px-4 py-3 shadow-sm">
        <View>
          <Text className="text-xl font-bold text-gray-800">Welcome, {driver?.name || 'Driver'}</Text>
          <Text className="text-gray-500">License: {driver?.driverLicense || 'N/A'}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className={`font-semibold mr-2 ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isOnline ? "#16a34a" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleOnlineToggle}
            value={isOnline}
          />
          <TouchableOpacity 
            className="ml-3 p-2 rounded-full bg-gray-100"
            onPress={handleLogout}
          >
            <LogOut size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container} className="bg-gray-300">
            <MapContainer 
              latitude={currentLocation.latitude} 
              longitude={currentLocation.longitude} 
            />
            <View className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg">
              <Navigation color="#1f2937" size={22} />
            </View>
        </View>

        {isOnline && pendingBookings.length > 0 && pendingBookings.map(renderBookingRequest)}

        <View className="flex-row justify-around p-4 bg-white mt-[-10] mx-4 rounded-xl shadow-md z-10 relative">
            <View className="items-center">
                <DollarSign size={24} color="#16a34a" />
                <Text className="text-xl font-bold text-gray-800 mt-1">₹{totalEarnings.toFixed(2)}</Text>
                <Text className="text-gray-500">Total Earnings</Text>
            </View>
            <View className="items-center">
                <CheckCircle size={24} color="#3b82f6" />
                <Text className="text-xl font-bold text-gray-800 mt-1">
                  {bookingHistory.filter(b => b.bookingStatus === 'completed').length}
                </Text>
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

        {activeTab === 'details' ? renderActiveRide() : renderBookingHistory()}

      </ScrollView>
    </SafeAreaView>
  );
}