# FastAid - Emergency Response App

FastAid is a React Native mobile application built with Expo that connects users in emergency situations with the nearest available ambulances and hospitals. The app provides real-time location tracking, route optimization, and emergency response coordination.

## Features

- 🚑 **Nearest Ambulance Detection**: Find the closest available ambulance using PostGIS geospatial queries
- 🏥 **Hospital Locator**: Locate nearby hospitals and medical facilities
- 🗺️ **Real-time Navigation**: Get optimized routes between user location and emergency services
- ⏱️ **ETA Calculation**: Real-time estimated arrival times for emergency vehicles
- 📍 **Location Services**: GPS-based location tracking and geocoding
- 🔐 **User Authentication**: Secure user registration and login system
- 📅 **Ambulance Scheduling**: Schedule ambulances in advance for non-emergency medical transport
- 📱 **Cross-platform**: Works on both iOS and Android devices

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **Authentication**: Supabase Auth
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Maps**: OLA Maps API for routing and navigation
- **Real-time**: WebSocket connections for live updates

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account
- OLA Maps API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fastaid
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_API_KEY=your_supabase_anon_key
   EXPO_PUBLIC_OLA_API_KEY=your_ola_maps_api_key
   EXPO_PUBLIC_RAZORPAY_API_KEY=your_razorpay_api_key
   ```

   **Note**: For Razorpay integration:
   - Get your API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Use test keys for development (`rzp_test_...`)
   - Use live keys for production (`rzp_live_...`)
   - The app includes fallback payment simulation for development

4. **Database Setup**
   Run the following SQL in your Supabase SQL Editor:
   ```sql
   -- Enable PostGIS
   CREATE EXTENSION IF NOT EXISTS postgis;

   -- Create nearby_ambulance function
   CREATE OR REPLACE FUNCTION public.nearby_ambulance(
     latitude_param  double precision,
     longitude_param double precision
   )
   RETURNS TABLE (
     id           uuid,
     name         text,
     lat          double precision,
     long         double precision,
     dist_meters  double precision
   )
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   AS $$
     SELECT
       d.id,
       d.name,
       ST_Y(d.location::geometry)  as lat,
       ST_X(d.location::geometry)  as long,
       ST_Distance(
         d.location,
         ST_Point(longitude_param, latitude_param)::geography
       )                            as dist_meters
     FROM public."Driver" d
     WHERE d."isVerified" = true
     ORDER BY d.location <-> ST_Point(longitude_param, latitude_param)::geography
     LIMIT 1;
   $$;

   -- Grant execute permissions
   GRANT EXECUTE ON FUNCTION public.nearby_ambulance(double precision, double precision)
     TO anon, authenticated;
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

## Project Structure

```
fastaid/
├── src/
│   ├── app/                 # App router pages
│   │   ├── (user)/          # User-specific routes
│   │   │   ├── bookings.tsx # Booking management
│   │   │   ├── index.tsx    # Home screen
│   │   │   └── map.tsx      # Map view
│   │   └── _layout.tsx      # Root layout
│   ├── components/          # Reusable components
│   │   ├── Map.tsx          # Map component
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication context
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility libraries
│       ├── api/             # API functions
│       │   ├── maps.ts      # Maps and location APIs
│       │   └── ...
│       ├── services/        # Service layer
│       └── supabase.ts      # Supabase client
├── assets/                  # Static assets
└── ...
```

## API Functions

### Maps API (`src/lib/api/maps.ts`)

- `getNearestAmbulance(latitude, longitude)`: Find the closest available ambulance
- `getNearestHospital(latitude, longitude)`: Locate nearby hospitals
- `getRouteToAmbulance(userLocation, ambulanceLocation)`: Get optimized route
- `getETAForAmbulance(userLocation, ambulanceLocation)`: Calculate arrival time
- `getAddressFromCoordinates(latitude, longitude)`: Reverse geocoding

### Booking API (`src/lib/api/booking.ts`)

- `createBookingOrder(bookingData)`: Create a new ambulance booking (emergency or scheduled)
- `updateBookingPaymentStatus(bookingId, paymentId, status)`: Update payment status
- `getBookingDetails(bookingId)`: Retrieve booking information
- `updateDriverAvailability(driverId, isAvailable)`: Update driver availability

## Scheduling Feature

The app now supports scheduling ambulances in advance for non-emergency medical transport:

### How to Schedule an Ambulance

1. **From Dashboard**: Tap "Schedule Ambulance" in the Quick Actions section
2. **From Map**: Tap "Schedule Ambulance" button on the map screen
3. **Enter Details**: 
   - Select date (YYYY-MM-DD format)
   - Select time (HH:MM format)
   - Review driver and hospital details
4. **Confirm Booking**: Complete the booking with payment

### Scheduling Features

- **Advance Booking**: Schedule up to 30 days in advance
- **Flexible Timing**: Choose any available time slot
- **Driver Assignment**: Automatic assignment of available drivers
- **Hospital Selection**: Automatic selection of nearest appropriate hospital
- **Payment Integration**: Secure payment processing for scheduled bookings
- **Booking Management**: View and manage scheduled bookings in the Bookings tab

### Booking Types

- **Emergency**: Immediate ambulance dispatch for urgent situations
- **Scheduled**: Pre-arranged ambulance service for planned medical transport
- **Regular**: Standard ambulance booking without specific scheduling

### Database Schema

The booking system supports both emergency and scheduled bookings with the following fields:
- `isScheduled`: Boolean flag indicating scheduled booking
- `scheduledDate`: Date for scheduled pickup (YYYY-MM-DD)
- `scheduledTime`: Time for scheduled pickup (HH:MM)
- `bookingStatus`: Status tracking (pending, confirmed, scheduled, in_progress, completed, cancelled)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@fastaid.com or create an issue in this repository.

## Troubleshooting

### Payment Gateway Issues

If you encounter the error `Cannot read property 'open' of null` during payment:

1. **Check Razorpay API Key**: Ensure `EXPO_PUBLIC_RAZORPAY_API_KEY` is properly set in your `.env` file
2. **Verify API Key Format**: The key should start with `rzp_test_` (development) or `rzp_live_` (production)
3. **Development Mode**: In development, the app uses a payment simulation. For real payments, build with `expo run:android` or `expo run:ios`
4. **Module Installation**: Ensure `react-native-razorpay` is properly installed: `npm install react-native-razorpay`

### Common Issues

- **Location Services**: Ensure location permissions are granted on the device
- **Network Connectivity**: Check internet connection for real-time features
- **Supabase Connection**: Verify Supabase URL and API key configuration

## Acknowledgments

- Supabase for the backend infrastructure
- OLA Maps for routing and navigation services
- Expo for the React Native development platform
- PostGIS for geospatial functionality
