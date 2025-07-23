document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT ---
    // Replace "YOUR_API_KEY" with your actual OpenWeatherMap API key
    const API_KEY = "37afd64e45135d9a80eec0b701f4bc45"; // I've added the key you provided
    const DEFAULT_CITY = "London";

    // --- VIDEO FILE PATHS ---
    // IMPORTANT: Replace these with the actual paths to your video files.
    const videoPaths = {
        sunny: 'videos/sunny.mp4',
        clear: 'videos/clear.mp4', // Added clear sky video
        cloudy: 'videos/cloudy.mp4',
        rainy: 'videos/rainy.mp4',
        default: 'videos/cloudy.mp4' // Fallback video
    };

    // DOM Element References
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const backgroundVideo = document.getElementById('background-video');

    // --- UTILITY FUNCTIONS ---
    
    // Function to show a message modal
    const showMessage = (message) => {
        messageText.textContent = message;
        messageModal.classList.remove('hidden');
    };

    // Function to hide the message modal
    const hideMessage = () => {
        messageModal.classList.add('hidden');
    };

    // Function to format time (e.g., 1689912000 -> "05:30")
    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    
    // Function to format date (e.g., 1689912000 -> "Saturday, 08-03-2025")
    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    };

    // --- API FETCH FUNCTIONS ---

    const getWeatherData = async (city) => {
        if (API_KEY === "YOUR_API_KEY") {
            showMessage("Please add your OpenWeatherMap API key in the script.");
            return;
        }

        try {
            // 1. Get coordinates from city name
            const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`);
            if (!geoResponse.ok) throw new Error("Failed to get coordinates.");
            const geoData = await geoResponse.json();
            if (geoData.length === 0) {
                throw new Error(`City "${city}" not found.`);
            }
            const { lat, lon, name: cityName } = geoData[0];

            // 2. Fetch all weather data in parallel
            const [currentWeatherResponse, forecastResponse, airPollutionResponse] = await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
            ]);

            if (!currentWeatherResponse.ok || !forecastResponse.ok || !airPollutionResponse.ok) {
                throw new Error("Failed to fetch weather data.");
            }

            const currentWeatherData = await currentWeatherResponse.json();
            const forecastData = await forecastResponse.json();
            const airPollutionData = await airPollutionResponse.json();
            
            // 3. Update the UI with all fetched data
            updateUI(cityName, currentWeatherData, forecastData, airPollutionData);

        } catch (error) {
            console.error("Error fetching weather data:", error);
            showMessage(error.message);
        }
    };

    // --- UI UPDATE FUNCTIONS ---

    const updateUI = (cityName, current, forecast, airPollution) => {
        updateCurrentWeather(cityName, current);
        updateHighlights(current);
        updateAirQuality(airPollution);
        updateHourlyForecast(forecast.list);
        update5DayForecast(forecast.list);
        updateBackgroundVideo(current.weather[0].main);
    };
    
    const updateCurrentWeather = (cityName, data) => {
        document.getElementById('city-name').textContent = cityName;
        document.getElementById('weather-description').textContent = data.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
        document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        document.getElementById('weather-icon').onerror = function() { this.src='https://placehold.co/100x100/ffffff/333333?text=Icon'; }; // Fallback image
        
        // Update date and time
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
        document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Update sunrise and sunset
        document.getElementById('sunrise-time').textContent = formatTime(data.sys.sunrise);
        document.getElementById('sunset-time').textContent = formatTime(data.sys.sunset);
    };

    const updateBackgroundVideo = (weatherCondition) => {
        let videoSrc;
        switch (weatherCondition) {
            case 'Clear':
                videoSrc = videoPaths.clear; // Use clear sky video
                break;
            case 'Sunny':
                videoSrc = videoPaths.sunny;
                break;
            case 'Clouds':
                videoSrc = videoPaths.cloudy;
                break;
            case 'Rain':
            case 'Drizzle':
            case 'Thunderstorm':
                videoSrc = videoPaths.rainy;
                break;
            default:
                videoSrc = videoPaths.default;
        }

        // Only change the source and reload if it's different
        if (backgroundVideo.currentSrc !== videoSrc) {
            backgroundVideo.src = videoSrc;
            backgroundVideo.load();
            backgroundVideo.play().catch(error => {
                console.error("Video autoplay was prevented:", error);
            });
        }
    };

    const updateHighlights = (data) => {
        document.querySelector('#humidity p:last-child').textContent = `${data.main.humidity} %`;
        document.querySelector('#wind-speed p:last-child').textContent = `${data.wind.speed.toFixed(1)} m/s`;
        document.querySelector('#pressure p:last-child').textContent = `${data.main.pressure} hPa`;
        document.querySelector('#visibility p:last-child').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    };

    const updateAirQuality = (data) => {
        const aqiData = data.list[0].components;
        const aqiContainer = document.getElementById('aqi-data');
        aqiContainer.innerHTML = `
            <div class="text-center">
                <p class="text-slate-300 text-sm">PM2.5</p>
                <p class="font-bold text-xl">${aqiData.pm2_5.toFixed(2)}</p>
            </div>
            <div class="text-center">
                <p class="text-slate-300 text-sm">SO2</p>
                <p class="font-bold text-xl">${aqiData.so2.toFixed(2)}</p>
            </div>
            <div class="text-center">
                <p class="text-slate-300 text-sm">NO2</p>
                <p class="font-bold text-xl">${aqiData.no2.toFixed(2)}</p>
            </div>
            <div class="text-center">
                <p class="text-slate-300 text-sm">O3</p>
                <p class="font-bold text-xl">${aqiData.o3.toFixed(2)}</p>
            </div>
        `;
    };

    const updateHourlyForecast = (hourlyData) => {
        const hourlyContainer = document.getElementById('forecast-hourly');
        hourlyContainer.innerHTML = ''; // Clear previous data
        const next8hours = hourlyData.slice(0, 8);

        next8hours.forEach(item => {
            const hour = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            const temp = `${Math.round(item.main.temp)}°C`;
            const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;

            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'flex-shrink-0 text-center space-y-2';
            hourlyItem.innerHTML = `
                <p class="text-sm text-slate-300">${hour}</p>
                <img src="${icon}" alt="${item.weather[0].description}" class="w-12 h-12 mx-auto" onerror="this.src='https://placehold.co/48x48/ffffff/333333?text=Icon'">
                <p class="font-semibold">${temp}</p>
            `;
            hourlyContainer.appendChild(hourlyItem);
        });
    };
    
    const update5DayForecast = (dailyData) => {
        const forecastContainer = document.getElementById('forecast-5day');
        forecastContainer.innerHTML = ''; // Clear previous data

        const dailyForecasts = {};
        dailyData.forEach(item => {
            const date = new Date(item.dt * 1000).toISOString().split('T')[0];
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = { temps: [], icon: item.weather[0].icon, dt: item.dt };
            }
            dailyForecasts[date].temps.push(item.main.temp);
        });

        // Get forecast for the next 5 unique days
        Object.values(dailyForecasts).slice(1, 6).forEach(day => {
            const avgTemp = Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length);
            const iconUrl = `https://openweathermap.org/img/wn/${day.icon}.png`;
            const formattedDate = formatDate(day.dt);

            const forecastItem = document.createElement('div');
            forecastItem.className = 'flex justify-between items-center';
            forecastItem.innerHTML = `
                <div class="flex items-center gap-2">
                    <img src="${iconUrl}" alt="weather" class="w-8 h-8" onerror="this.src='https://placehold.co/32x32/ffffff/333333?text=Icon'">
                    <span>${avgTemp}°C</span>
                </div>
                <span class="text-sm text-slate-300">${formattedDate}</span>
            `;
            forecastContainer.appendChild(forecastItem);
        });
    };


    // --- EVENT LISTENERS ---
    const handleSearch = () => {
        const city = searchInput.value.trim();
        if (city) {
            getWeatherData(city);
            searchInput.value = '';
        } else {
            showMessage("Please enter a city name.");
        }
    };

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    closeModalBtn.addEventListener('click', hideMessage);
    
    // --- INITIAL LOAD ---
    getWeatherData(DEFAULT_CITY);
});
