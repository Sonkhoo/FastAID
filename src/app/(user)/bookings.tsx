import { useRouter } from 'expo-router';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Interfaces for dynamic booking data
interface DynamicBooking {
  id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  paymentStatus: boolean;
  bookingStatus: string;
  estimatedCost: number;
  estimatedTime: string;
  type: string; // Emergency, Scheduled, etc.
  patient: string;
  pickup: string;
  destination: string;
  ambulanceId: string;
  cost?: string;
  eta?: string;
  date?: string;
  time?: string;
  driver: {
    id: string;
    name: string;
    phone?: string;
    driverLicense?: string;
  };
  hospital: {
    name: string;
    speciality: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  user: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

export default function Bookings() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('all');
  const [bookings, setBookings] = useState<DynamicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    scheduled: 0,
  });
  const router = useRouter();

  const tabs = [
    { id: 'all', label: 'All Bookings', count: bookings.length },
    { id: 'in_progress', label: 'Active', count: bookings.filter(b => b.status === 'in_progress').length },
    { id: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
    { id: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
  ];

  const filteredBookings = selectedTab === 'all' ? bookings : bookings.filter(b => b.status === selectedTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'in_progress': return '#f59e0b';
      case 'confirmed': return '#2563eb';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Activity;
      case 'confirmed': return Calendar;
      case 'cancelled': return AlertCircle;
      default: return Clock;
    }
  };

  // Function to fetch bookings from database
  const fetchBookings = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('Booking')
        .select(`
          id,
          created_at,
          paymentStatus,
          bookingStatus,
          estimatedCost,
          estimatedTime,
          driverId,
          userId,
          hospital,
          Driver (
            id,
            name,
            phoneNumber,
            driverLicense
          ),
          User (
            id,
            name,
            phoneNumber
          )
        `)
        .eq('userId', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        Alert.alert('Error', 'Failed to load bookings');
        return;
      }

      // Transform the data to match our interface
      const transformedBookings: DynamicBooking[] = data.map((booking: any) => ({
        id: booking.id,
        status: booking.bookingStatus || 'pending',
        createdAt: booking.created_at,
        updatedAt: booking.created_at, // Use created_at as fallback since updatedAt doesn't exist
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        estimatedCost: booking.estimatedCost || 0,
        estimatedTime: booking.estimatedTime || 'N/A',
        type: booking.bookingStatus === 'confirmed' ? 'Emergency' : 'Scheduled',
        patient: booking.User?.name || 'Unknown',
        pickup: 'Current Location', // This would need to be stored in the booking
        destination: 'Hospital', // This would need to be stored in the booking
        ambulanceId: booking.Driver?.driverLicense || 'N/A',
        cost: `$${booking.estimatedCost || 0}`,
        eta: booking.estimatedTime,
        date: new Date(booking.created_at).toLocaleDateString(),
        time: new Date(booking.created_at).toLocaleTimeString(),
        driver: {
          id: booking.Driver?.id || '',
          name: booking.Driver?.name || 'Unknown Driver',
          phone: booking.Driver?.phoneNumber || '',
          driverLicense: booking.Driver?.driverLicense || '',
        },
        hospital: {
          name: 'Hospital', // This would need to be stored in the booking
          speciality: 'Emergency',
          location: { latitude: 0, longitude: 0 }, // This would need to be stored
        },
        user: {
          id: booking.User?.id || '',
          name: booking.User?.name || 'Unknown User',
          phoneNumber: booking.User?.phoneNumber || '',
        },
      }));

      setBookings(transformedBookings);
      
      // Update stats
      setStats({
        total: transformedBookings.length,
        completed: transformedBookings.filter(b => b.status === 'completed').length,
        inProgress: transformedBookings.filter(b => b.status === 'in_progress').length,
        scheduled: transformedBookings.filter(b => b.status === 'confirmed').length,
      });

    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  // Function to navigate to new booking
  const handleNewBooking = () => {
    router.push('/map');
  };

  // Fetch bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, [user?.id]);

  // Set up real-time subscription for booking updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('booking_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Booking',
          filter: `userId=eq.${user.id}`,
        },
        (payload) => {
          console.log('Booking updated:', payload);
          fetchBookings(); // Refresh the list when a booking is updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Bookings</Text>
            <Text className="text-gray-600 mt-1">Manage your ambulance requests</Text>
          </View>
          <TouchableOpacity className="bg-emergency-50 p-3 rounded-full">
            <Plus size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View className="flex-row space-x-3">
          <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3 flex-row items-center">
            <Search size={20} color="#6b7280" />
            <Text className="text-gray-500 ml-2">Search bookings...</Text>
          </View>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl">
            <Filter size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#dc2626']}
            tintColor="#dc2626"
          />
        }
      >
        {/* Stats Cards */}
        <View className="px-6 mt-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-4">
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-emergency-600">{stats.total}</Text>
              <Text className="text-gray-600 text-sm">Total Trips</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-green-600">{stats.completed}</Text>
              <Text className="text-gray-600 text-sm">Completed</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-yellow-600">{stats.inProgress}</Text>
              <Text className="text-gray-600 text-sm">In Progress</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-medical-600">{stats.scheduled}</Text>
              <Text className="text-gray-600 text-sm">Confirmed</Text>
            </View>
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mt-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-3">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-full mr-3 ${
                  selectedTab === tab.id ? 'bg-emergency-600' : 'bg-white'
                }`}
              >
                <Text className={`font-medium ${
                  selectedTab === tab.id ? 'text-white' : 'text-gray-700'
                }`}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bookings List */}
        <View className="px-6 mt-6 mb-8">
          <Text className="text-xl font-bold text-gray-900 mb-4">Recent Bookings</Text>
          
          {loading ? (
            <View className="bg-white rounded-xl p-8 shadow-sm">
              <Text className="text-gray-600 text-center">Loading bookings...</Text>
            </View>
          ) : filteredBookings.length === 0 ? (
            <View className="bg-white rounded-xl p-8 shadow-sm">
              <Text className="text-gray-600 text-center">No bookings found</Text>
              <TouchableOpacity 
                className="bg-emergency-600 rounded-xl p-4 mt-4"
                onPress={handleNewBooking}
              >
                <Text className="text-white font-semibold text-center">Book Your First Ambulance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {filteredBookings.map((booking) => {
                const StatusIcon = getStatusIcon(booking.bookingStatus);
                const statusColor = getStatusColor(booking.bookingStatus);
                
                return (
                  <TouchableOpacity key={booking.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-row items-center">
                        <View className="p-2 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
                          <StatusIcon size={18} color={statusColor} />
                        </View>
                        <View className="ml-3">
                          <Text className="font-semibold text-gray-900">Booking #{booking.id.slice(0, 8)}</Text>
                          <Text className="text-gray-600 text-sm">{booking.type}</Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
                          <Text className="text-xs font-medium" style={{ color: statusColor }}>
                            {booking.bookingStatus.toUpperCase()}
                          </Text>
                        </View>
                        {booking.eta && (
                          <Text className="text-gray-500 text-xs mt-1">ETA: {booking.eta}</Text>
                        )}
                      </View>
                    </View>

                    <View className="space-y-2">
                      <View className="flex-row items-center">
                        <User size={16} color="#6b7280" />
                        <Text className="text-gray-700 ml-2">{booking.patient}</Text>
                      </View>
                      
                      <View className="flex-row items-center">
                        <Clock size={16} color="#6b7280" />
                        <Text className="text-gray-700 ml-2">{booking.date} at {booking.time}</Text>
                      </View>
                      
                      <View className="flex-row items-start">
                        <MapPin size={16} color="#6b7280" className="mt-0.5" />
                        <View className="ml-2 flex-1">
                          <Text className="text-gray-700 text-sm">From: {booking.pickup}</Text>
                          <Text className="text-gray-700 text-sm">To: {booking.destination}</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm">Driver: {booking.driver.name}</Text>
                        {booking.cost && (
                          <Text className="text-gray-600 text-sm ml-4">Cost: {booking.cost}</Text>
                        )}
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* New Booking Button */}
        <View className="px-6 mb-8">
          <TouchableOpacity 
            className="bg-emergency-600 rounded-xl p-4 flex-row items-center justify-center"
            onPress={handleNewBooking}
          >
            <Plus size={24} color="#ffffff" />
            <Text className="text-white font-semibold text-lg ml-2">Book New Ambulance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}