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