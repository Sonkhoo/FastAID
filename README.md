# FastAid - Emergency Response App

FastAid is a React Native mobile application built with Expo that connects users in emergency situations with the nearest available ambulances and hospitals. The app provides real-time location tracking, route optimization, and emergency response coordination.

## Features

- 🚑 **Nearest Ambulance Detection**: Find the closest available ambulance using PostGIS geospatial queries
- 🏥 **Hospital Locator**: Locate nearby hospitals and medical facilities
- 🗺️ **Real-time Navigation**: Get optimized routes between user location and emergency services
- ⏱️ **ETA Calculation**: Real-time estimated arrival times for emergency vehicles
- 📍 **Location Services**: GPS-based location tracking and geocoding
- 🔐 **User Authentication**: Secure user registration and login system
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
   ```

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

## Acknowledgments

- Supabase for the backend infrastructure
- OLA Maps for routing and navigation services
- Expo for the React Native development platform
- PostGIS for geospatial functionality
