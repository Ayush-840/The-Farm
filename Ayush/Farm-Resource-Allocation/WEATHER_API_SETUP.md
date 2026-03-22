# OpenWeatherMap API Setup Guide

## Overview
The weather forecasting section now supports OpenWeatherMap API 3.0 for accurate weather data. The system includes automatic fallback to Open-Meteo (free, no API key) if OpenWeatherMap is not configured.

## Setup Instructions

### Step 1: Get OpenWeatherMap API Key

1. **Sign up for free account:**
   - Go to https://openweathermap.org/api
   - Click "Sign Up" or "Sign In"
   - Create a free account

2. **Get your API key:**
   - After signing in, go to "API keys" section
   - Copy your API key (or generate a new one)
   - Free tier includes: 1,000 calls/day, 60 calls/minute

### Step 2: Configure API Key

1. **Open the config file:**
   - File: `ayush/weather-config.js`

2. **Update the API key:**
   ```javascript
   OPENWEATHER_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE', // Replace this
   ```

3. **Enable OpenWeatherMap:**
   ```javascript
   USE_OPENWEATHER: true, // Change to true
   ```

### Step 3: Test the Integration

1. **Start the application:**
   - Open `index.html` in your browser
   - Fill in the form and submit

2. **Check the weather section:**
   - Look at the "Live Weather Intelligence" panel
   - Weather data should now come from OpenWeatherMap

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for "OpenWeatherMap" in the logs
   - If you see errors, check your API key

## API Features

### What OpenWeatherMap Provides:
- ✅ **Current Weather**: Temperature, humidity, pressure, wind
- ✅ **7-Day Forecast**: Daily weather predictions
- ✅ **Hourly Forecast**: Next 48 hours detailed forecast
- ✅ **Rain Probability**: Accurate precipitation probability
- ✅ **UV Index**: Sun protection information
- ✅ **Visibility**: Atmospheric visibility data

### Data Structure:
```javascript
{
    temp: 28,                    // Temperature in Celsius
    humidity: 65,                // Humidity percentage
    rainfall: 2.5,               // Rainfall in mm
    rain_probability: 45,        // Rain probability percentage
    isLive: true,                // Real-time data flag
    source: 'OpenWeatherMap',    // Data source
    forecast: [                  // 7-day forecast array
        {
            date: Date,
            temp: 30,
            tempMin: 25,
            tempMax: 32,
            humidity: 60,
            rainfall: 0,
            rainProbability: 20,
            description: 'Clear sky',
            icon: '01d'
        },
        // ... 6 more days
    ],
    // Additional fields:
    feels_like: 30,             // Feels like temperature
    pressure: 1013,             // Atmospheric pressure
    wind_speed: 5.2,            // Wind speed m/s
    wind_deg: 180,              // Wind direction
    uv_index: 6,                 // UV index
    visibility: 10,             // Visibility in km
    description: 'Clear sky',    // Weather description
    icon: '01d'                 // Weather icon code
}
```

## Fallback System

The system has a 3-tier fallback:

1. **OpenWeatherMap** (if configured and API key valid)
2. **Open-Meteo** (free, no API key required)
3. **Heuristic Data** (monthly averages based on season)

## Troubleshooting

### Error: "Invalid API key"
- **Solution**: Check that your API key is correct in `weather-config.js`
- Make sure you copied the entire key
- Verify the key is active in OpenWeatherMap dashboard

### Error: "API rate limit exceeded"
- **Solution**: You've exceeded 1,000 calls/day (free tier)
- Wait 24 hours or upgrade to paid plan
- System will automatically fallback to Open-Meteo

### Weather data not showing
- **Check**: Browser console for errors
- **Verify**: API key is set and `USE_OPENWEATHER: true`
- **Test**: Try the fallback by setting `USE_OPENWEATHER: false`

### CORS Errors
- OpenWeatherMap API should work from browser
- If you see CORS errors, the API key might be invalid
- System will automatically fallback to Open-Meteo

## Cost Information

### Free Tier (Recommended for testing):
- 1,000 API calls/day
- 60 calls/minute
- Current weather + 7-day forecast
- Perfect for development and small projects

### Paid Plans:
- Start from $40/month
- Higher rate limits
- More features available

## Security Note

⚠️ **Important**: Never commit your API key to version control!

- The `weather-config.js` file should be in `.gitignore` if it contains real keys
- For production, use environment variables or server-side proxy
- Current setup is for development only

## Example Configuration

```javascript
window.WeatherConfig = {
    OPENWEATHER_API_KEY: 'abc123def456ghi789', // Your actual key
    USE_OPENWEATHER: true,                      // Enable OpenWeatherMap
    FALLBACK_TO_OPENMETEO: true                 // Enable fallback
};
```

## Next Steps

1. ✅ Get API key from OpenWeatherMap
2. ✅ Update `weather-config.js` with your key
3. ✅ Set `USE_OPENWEATHER: true`
4. ✅ Test the application
5. ✅ Enjoy accurate weather forecasts!
