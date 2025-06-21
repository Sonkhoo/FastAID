import { supabase } from '../supabase';

export interface DashboardStats {
  availableAmbulances: number;
  activeBookings: number;
  averageResponseTime: string;
}

// Helper function to get all booking statuses (for debugging)
export async function getAllBookingStatuses(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('Booking')
      .select('bookingStatus');

    if (error) {
      console.error('Error fetching booking statuses:', error);
      return [];
    }

    const statuses = [...new Set(data?.map(b => b.bookingStatus) || [])];
    console.log('All booking statuses in database:', statuses);
    return statuses;
  } catch (error) {
    console.error('Error fetching booking statuses:', error);
    return [];
  }
}

// Get count of available ambulances
export async function getAvailableAmbulancesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('Driver')
      .select('*', { count: 'exact', head: true })
      .eq('isAvailable', true)
      .eq('isVerified', true);

    if (error) {
      console.error('Error fetching available ambulances count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error fetching available ambulances count:', error);
    return 0;
  }
}

// Get count of active bookings for a user
export async function getActiveBookingsCount(userId: string): Promise<number> {
  try {
    console.log('Fetching active bookings for user:', userId);
    
    // First, let's see what booking statuses exist
    const { data: statusData, error: statusError } = await supabase
      .from('Booking')
      .select('bookingStatus')
      .eq('userId', userId);
    
    if (!statusError && statusData) {
      console.log('Available booking statuses for user:', [...new Set(statusData.map(b => b.bookingStatus))]);
    }

    // Try different status combinations
    const statusCombinations = [
      ['pending', 'confirmed'],
      ['confirmed', 'in_progress'],
      ['pending', 'confirmed', 'in_progress'],
      ['confirmed'],
      ['pending']
    ];

    for (const statuses of statusCombinations) {
      try {
        const { count, error } = await supabase
          .from('Booking')
          .select('*', { count: 'exact', head: true })
          .eq('userId', userId)
          .in('bookingStatus', statuses);

        if (!error && count !== null) {
          console.log(`Active bookings count for user with statuses ${statuses}:`, count);
          return count;
        }
      } catch (err) {
        console.log(`Failed with statuses ${statuses}:`, err);
        continue;
      }
    }

    // If all combinations fail, try without status filter
    const { count, error } = await supabase
      .from('Booking')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    if (error) {
      console.error('Error fetching bookings count:', error);
      return 0;
    }

    console.log('Total bookings count for user (no status filter):', count);
    return count || 0;
  } catch (error) {
    console.error('Error fetching active bookings count:', error);
    return 0;
  }
}

// Get count of all active bookings (for system-wide stats)
export async function getAllActiveBookingsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('Booking')
      .select('*', { count: 'exact', head: true })
      .in('bookingStatus', ['pending', 'confirmed']);

    if (error) {
      console.error('Error fetching all active bookings count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error fetching all active bookings count:', error);
    return 0;
  }
}

// Calculate average response time (mock calculation for now)
export async function getAverageResponseTime(): Promise<string> {
  try {
    // For now, return a mock average based on recent bookings
    // In a real implementation, you would calculate this from actual booking data
    const { data, error } = await supabase
      .from('Booking')
      .select('estimatedTime, created_at')
      .eq('bookingStatus', 'completed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(10);

    if (error || !data || data.length === 0) {
      return '4.2 min'; // Default fallback
    }

    // Calculate average from estimatedTime (assuming it's in minutes)
    const totalTime = data.reduce((sum, booking) => {
      const timeStr = booking.estimatedTime;
      if (timeStr && timeStr.includes('min')) {
        const minutes = parseFloat(timeStr.replace(' min', ''));
        return sum + (isNaN(minutes) ? 0 : minutes);
      }
      return sum + 4.2; // Default fallback
    }, 0);

    const average = totalTime / data.length;
    return `${average.toFixed(1)} min`;
  } catch (error) {
    console.error('Error calculating average response time:', error);
    return '4.2 min';
  }
}

// Get all dashboard stats
export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  try {
    const [availableAmbulances, activeBookings, averageResponseTime] = await Promise.all([
      getAvailableAmbulancesCount(),
      userId ? getActiveBookingsCount(userId) : getAllActiveBookingsCount(),
      getAverageResponseTime()
    ]);

    return {
      availableAmbulances,
      activeBookings,
      averageResponseTime
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      availableAmbulances: 0,
      activeBookings: 0,
      averageResponseTime: '4.2 min'
    };
  }
} 