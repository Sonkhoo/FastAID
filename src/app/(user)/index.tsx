import { router } from 'expo-router';
import { Clock, Heart, LogOut, Map, Truck, Users, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../../global.css';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserLocation } from '../../lib/api/location';
import { getETAForAmbulance, getNearestAmbulance } from '../../lib/api/maps';
import { getAllBookingStatuses, getDashboardStats, type DashboardStats } from '../../lib/api/stats';
import { getUserLocation, requestLocationPermission } from '../../lib/services/location';
import { supabase } from '../../lib/supabase';

interface Ambulance {
  id: any;
  name: any;
  location: {
    latitude: any;
    longitude: any;
  };
  is_available: boolean;
}

const emergencyStats = [
    { title: 'Available Ambulances', value: '12', icon: Truck, color: 'text-accent-600' },
    { title: 'Response Time', value: '4.2 min', icon: Clock, color: 'text-secondary-600' },
    { title: 'Active Bookings', value: '3', icon: Users, color: 'text-primary-600' },
];
  
const quickActions = [
    { title: 'Emergency Booking', subtitle: 'Immediate assistance', icon: Zap, color: 'bg-red-500' },
    { title: 'Schedule Ambulance', subtitle: 'Plan ahead', icon: Clock, color: 'bg-red-500' },
    { title: 'Find Hospital', subtitle: 'Nearest facilities', icon: Map, color: 'bg-red-500' },
    { title: 'Medical Records', subtitle: 'Your health info', icon: Heart, color: 'bg-red-500' },
];
  
export default function Dashboard() {
    const { signOut, user } = useAuth();
    const [nearestAmbulance, setNearestAmbulance] = useState<Ambulance | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
      availableAmbulances: 0,
      activeBookings: 0,
      averageResponseTime: '4.2 min'
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const recentBookings = [
        {
        id: '1',
        type: 'Ambulance',
        date: 'Today, 10:30 AM',
        location: '123 Main St, City',
        status: 'In Progress',
        statusColor: 'text-yellow-600'
        },
        {
        id: '2',
        type: 'Medical Van',
        date: 'Nov 15, 10:00 AM',
        location: 'City General Hospital',
        status: 'Confirmed',
        statusColor: 'text-secondary-600'
        },
    ];

    // Fetch dashboard stats
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Debug: Get all booking statuses
        await getAllBookingStatuses();
        
        const dashboardStats = await getDashboardStats(user?.id);
        setStats(dashboardStats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch stats on component mount
    useEffect(() => {
      fetchDashboardStats();
    }, [user?.id]);

    // Refresh stats every 30 seconds
    useEffect(() => {
      const interval = setInterval(fetchDashboardStats, 30000);
      return () => clearInterval(interval);
    }, [user?.id]);

    // Set up real-time subscriptions for live updates
    useEffect(() => {
      if (!user?.id) return;

      // Subscribe to booking changes
      const bookingChannel = supabase
        .channel('dashboard_bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Booking',
            filter: `userId=eq.${user.id}`,
          },
          () => {
            console.log('Booking changed, updating dashboard stats');
            fetchDashboardStats();
          }
        )
        .subscribe();

      // Subscribe to driver availability changes
      const driverChannel = supabase
        .channel('dashboard_drivers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Driver',
          },
          () => {
            console.log('Driver changed, updating dashboard stats');
            fetchDashboardStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bookingChannel);
        supabase.removeChannel(driverChannel);
      };
    }, [user?.id]);

    // Handle pull-to-refresh
    const onRefresh = async () => {
      setRefreshing(true);
      await fetchDashboardStats();
      setRefreshing(false);
    };

    const handleLogout = async () => {
      try {
        await signOut();
        // src\app\(auth)\index.tsx
        // src\app\(user)\index.tsx
        router.replace('./(auth)/');
        // The AuthProvider will automatically handle the navigation
      } catch (error) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    };

    /*
      0. check if user is logged in(skip for now)
      1. check if user already in the supabase user table
      2. update user location to the supabase user table if user exist otherwise redirect to signup page
      3. get the nearest ambulance from the supabase ambulance table
      4. get the ETA for the ambulances or the nearest ambulance using google API
      5. show the nearest ambulance to the user
      6. insert the ambulance id to the supabase booking table
      7. navigate the user to the booking.tsx to show the booking details to the user including driver live location in maps
      */
      const handleEmergencyPress = async () => {
        try {
          // Step 1: Request permission
          const status = await requestLocationPermission();
          const location = await getUserLocation(status);
  
          if (!location) {
            Alert.alert('Location not available', 'Please enable location services and try again.');
            return;
          }
  
          const { latitude, longitude } = location;
  
          // Step 2: Update user location
          const updatedUser = await updateUserLocation(latitude, longitude);
          console.log('User location updated successfully in database:', updatedUser);
  
          // Step 3: Get nearest ambulance
          console.log(`Searching for ambulances near lat: ${latitude}, long: ${longitude}`);
          const ambulance = await getNearestAmbulance(latitude, longitude);
          if (!ambulance) {
            Alert.alert('No ambulances found', 'Please try again later.');
            return;
          }
          console.log('Nearest ambulance:', ambulance);

          const eta = await getETAForAmbulance({lat: latitude, lng: longitude}, { lat: 22.654885900941647, lng: 88.37130670753086});
  
          // Step 4: Set nearest ambulance
          setNearestAmbulance(ambulance as unknown as Ambulance);

          // Step 5: Navigate to the map page
          router.push('/map');
          
          // Refresh dashboard stats after a short delay to reflect any changes
          setTimeout(() => {
            fetchDashboardStats();
          }, 2000);
        } catch (error) {
          console.error('Error initializing dashboard:', error);
          Alert.alert('Error', 'Something went wrong. Please try again later.');
        }
      };

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}>
          {/* Header */}
          <View className="bg-red-500 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between px-6">
              <View>
                <Text className="text-3xl font-bold text-white">FastAID</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} className="p-2">
                <LogOut color="white" size={24} />
              </TouchableOpacity>
            </View>
          </View>
  
          {/* Emergency Hero Section */}
          <View className="mx-6 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 relative overflow-hidden">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 items-center">
                <Text className="text-primary-600 text-xl font-bold mb-2">Need Emergency Help?</Text>
                <Text className="text-primary-600 mb-4">Get immediate ambulance assistance</Text>
                <View className="flex-row items-center justify-center">
                <TouchableOpacity 
                  onPress={handleEmergencyPress}
                  className="bg-red-600 px-8 py-4 rounded-full self-start mt-4 justify-center items-center align-center"
                >
                  <Text className="text-white font-bold text-center text-lg">Call Ambulance</Text>
                </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
  
          {/* Stats Cards */}
          <View className="px-6 mt-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">Live Statistics</Text>
              {loading && (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                  <Text className="text-xs text-gray-500">Updating...</Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between">
              <View className="bg-white p-4 rounded-xl flex-1 mx-1 shadow-sm">
                <Truck color="#DC2626" size={24} />
                <Text className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stats.availableAmbulances}
                </Text>
                <Text className="text-gray-600 text-sm mt-1">Available Ambulances</Text>
              </View>
              <View className="bg-white p-4 rounded-xl flex-1 mx-1 shadow-sm">
                <Clock color="#DC2626" size={24} />
                <Text className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stats.averageResponseTime}
                </Text>
                <Text className="text-gray-600 text-sm mt-1">Response Time</Text>
              </View>
              <View className="bg-white p-4 rounded-xl flex-1 mx-1 shadow-sm">
                <Users color="#DC2626" size={24} />
                <Text className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stats.activeBookings}
                </Text>
                <Text className="text-gray-600 text-sm mt-1">Active Bookings</Text>
              </View>
            </View>
          </View>
  
          {/* Quick Actions */}
          <View className="px-6 mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">Quick Actions</Text>
            <View className="flex-row flex-wrap justify-between">
              {quickActions.map((action, index) => (
                <TouchableOpacity 
                  key={index} 
                  className="bg-white p-4 rounded-xl w-[48%] mb-4 shadow-sm"
                  onPress={() => {
                    if (action.title === 'Emergency Booking') {
                      handleEmergencyPress();
                    } else if (action.title === 'Find Hospital') {
                      router.push('/map');
                    }
                    // Add other actions as needed
                  }}
                >
                  <View className={`w-12 h-12 ${action.color} rounded-full items-center justify-center mb-3`}>
                    <action.icon size={24} color="white" />
                  </View>
                  <Text className="font-bold text-gray-900 mb-1">{action.title}</Text>
                  <Text className="text-gray-600 text-sm">{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
};


