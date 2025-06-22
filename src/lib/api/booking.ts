/*
1. create a booking
2. get booking details
3. update booking details
4. delete booking details
*/

import { supabase } from '../supabase';

export interface CreateBookingData {
  userId: string;
  driverId: string;
  hospital: {
    latitude: number;
    longitude: number;
  };
  estimatedCost: number;
  estimatedTime: string;
}

export interface BookingResponse {
  id: string;
  orderId: string;
  amount: number;
  status: string;
}

// Create Razorpay order using RPC function
async function createRazorpayOrder(amount: number, receipt: string, notes: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('create_razorpay_order', {
        amount_param: amount,
        currency_param: 'INR',
        receipt_param: receipt,
        notes_param: notes
      });

    if (error) {
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

export async function createBookingOrder(bookingData: CreateBookingData): Promise<BookingResponse> {
  try {
    // Create booking record in database
    const { data: booking, error: bookingError } = await supabase
      .from('Booking')
      .insert({
        userId: bookingData.userId,
        driverId: bookingData.driverId,
        hospital: `POINT(${bookingData.hospital.longitude} ${bookingData.hospital.latitude})`,
        paymentStatus: false,
        bookingStatus: 'pending',
        estimatedCost: bookingData.estimatedCost.toString(),
        estimatedTime: bookingData.estimatedTime
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }

    // Convert cost to paise (Razorpay expects amount in paise)
    const amountInPaise = Math.round(bookingData.estimatedCost * 100);

    // Create Razorpay order
    const orderData = await createRazorpayOrder(
      amountInPaise,
      `booking_${booking.id}`,
      {
        booking_id: booking.id,
        user_id: bookingData.userId,
        driver_id: bookingData.driverId,
        estimated_time: bookingData.estimatedTime,
        estimated_cost: bookingData.estimatedCost
      }
    );

    return {
      id: booking.id,
      orderId: orderData.id,
      amount: amountInPaise,
      status: 'created'
    };
  } catch (error) {
    console.error('Error creating booking order:', error);
    throw error;
  }
}

export async function updateBookingPaymentStatus(bookingId: string, paymentId: string, status: 'success' | 'failed'): Promise<void> {
  try {
    const { error } = await supabase
      .from('Booking')
      .update({
        paymentStatus: status === 'success',
        bookingStatus: status === 'success' ? 'confirmed' : 'cancelled'
      })
      .eq('id', bookingId);

    if (error) {
      throw new Error(`Payment status update failed: ${error.message}`);
    }
    
    console.log(`Booking ${bookingId} payment status updated to: ${status}`);
  } catch (error) {
    console.error('Error updating booking payment status:', error);
    throw error;
  }
}

export async function getBookingDetails(bookingId: string) {
  try {
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
      .eq('id', bookingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch booking details: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching booking details:', error);
    throw error;
  }
}

export async function updateBookingDetails(bookingId: string, updates: {
  estimatedCost?: number;
  estimatedTime?: string;
  bookingStatus?: string;
  paymentStatus?: boolean;
}) {
  try {
    const { error } = await supabase
      .from('Booking')
      .update(updates)
      .eq('id', bookingId);

    if (error) {
      throw new Error(`Failed to update booking details: ${error.message}`);
    }
    
    console.log(`Booking ${bookingId} updated successfully`);
  } catch (error) {
    console.error('Error updating booking details:', error);
    throw error;
  }
}

export async function updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('Driver')
      .update({
        isAvailable: isAvailable
      })
      .eq('id', driverId);

    if (error) {
      throw new Error(`Driver availability update failed: ${error.message}`);
    }
    
    console.log(`Driver ${driverId} availability updated to: ${isAvailable}`);
  } catch (error) {
    console.error('Error updating driver availability:', error);
    throw error;
  }
}

// Get pending bookings for a specific driver
export async function getPendingBookingsForDriver(driverId: string) {
  try {
    const { data, error } = await supabase
      .from('Booking')
      .select(`
        id,
        created_at,
        estimatedCost,
        estimatedTime,
        bookingStatus,
        userId,
        hospital,
        User (
          id,
          name,
          phoneNumber
        )
      `)
      .eq('driverId', driverId)
      .eq('bookingStatus', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending bookings: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    throw error;
  }
}

// Get driver's booking history
export async function getDriverBookingHistory(driverId: string) {
  try {
    const { data, error } = await supabase
      .from('Booking')
      .select(`
        id,
        created_at,
        estimatedCost,
        estimatedTime,
        bookingStatus,
        paymentStatus,
        userId,
        hospital,
        User (
          id,
          name,
          phoneNumber
        )
      `)
      .eq('driverId', driverId)
      .neq('bookingStatus', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch booking history: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching booking history:', error);
    throw error;
  }
}

// Accept a booking request
export async function acceptBooking(bookingId: string, driverId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('Booking')
      .update({
        bookingStatus: 'accepted',
        driverId: driverId
      })
      .eq('id', bookingId);

    if (error) {
      throw new Error(`Failed to accept booking: ${error.message}`);
    }

    // Update driver availability to false (busy)
    await updateDriverAvailability(driverId, false);
    
    console.log(`Booking ${bookingId} accepted by driver ${driverId}`);
  } catch (error) {
    console.error('Error accepting booking:', error);
    throw error;
  }
}

// Reject a booking request
export async function rejectBooking(bookingId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('Booking')
      .update({
        bookingStatus: 'rejected'
      })
      .eq('id', bookingId);

    if (error) {
      throw new Error(`Failed to reject booking: ${error.message}`);
    }
    
    console.log(`Booking ${bookingId} rejected`);
  } catch (error) {
    console.error('Error rejecting booking:', error);
    throw error;
  }
}

// Complete a booking
export async function completeBooking(bookingId: string, driverId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('Booking')
      .update({
        bookingStatus: 'completed'
      })
      .eq('id', bookingId);

    if (error) {
      throw new Error(`Failed to complete booking: ${error.message}`);
    }

    // Update driver availability to true (available again)
    await updateDriverAvailability(driverId, true);
    
    console.log(`Booking ${bookingId} completed by driver ${driverId}`);
  } catch (error) {
    console.error('Error completing booking:', error);
    throw error;
  }
}