// State Management
let currentUnit = 'C';
let chartInstance = null;
let currentCoords = { lat: 33.5138, lon: 36.2765, name: 'دمشق' }; // Default city

// Weather Code mapping to FontAwesome Icons & Arabic descriptions
const weatherMap = {
  0: { desc: 'صافٍ تماماً', icon: 'fa-sun', color: '#ffd166' },
  1: { desc: 'غائم جزئياً', icon: 'fa-cloud-sun', color: '#ffd166' },
  2: { desc: 'غائم جزئياً', icon: 'fa-cloud-sun', color: '#a0aab2' },
  3: { desc: 'غائم كلياً', icon: 'fa-cloud', color: '#8d99ae' },
  45: { desc: 'ضبابي', icon: 'fa-smog', color: '#c0c0c0' },
  48: { desc: 'ضباب صقيعي', icon: 'fa-smog', color: '#c0c0c0' },
  51: { desc: 'رذاذ خفيف', icon: 'fa-cloud-rain', color: '#4facfe' },
  61: { desc: 'أمطار خفيفة', icon: 'fa-cloud-showers-heavy', color: '#00f2fe' },
  63: { desc: 'أمطار متوسطة', icon: 'fa-cloud-showers-heavy', color: '#00c6ff' },
  65: { desc: 'أمطار غزيرة', icon: 'fa-cloud-showers-water', color: '#0072ff' },
  80: { desc: 'زخات مطرية', icon: 'fa-cloud-sun-rain', color: '#4facfe' },
  95: { desc: 'عاصفة رعدية', icon: 'fa-cloud-bolt', color: '#ff007f' }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  document.getElementById('geoBtn').addEventListener('click', getUserLocation);
  document.getElementById('unitToggle').addEventListener('click', toggleUnit);
});

function initApp() {
  updateDateDisplay();
  fetchWeatherData(currentCoords.lat, currentCoords.lon, currentCoords.name);
}

function updateDateDisplay() {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', calendar: 'gregory' };
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ar-EG', options);
}

// Fetch GeoCoding API
async function handleSearch() {
  const query = document.getElementById('cityInput').value.trim();
  if (!query) return;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ar`;
    const res = await fetch(geoUrl);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const city = data.results[0];
      currentCoords = {
        lat: city.latitude,
        lon: city.longitude,
        name: city.name + (city.country ? `, ${city.country}` : '')
      };
      fetchWeatherData(currentCoords.lat, currentCoords.lon, currentCoords.name);
    } else {
      alert('لم يتم العثور على المدينة، يرجى التأكد من الاسم!');
    }
  } catch (err) {
    alert('حدث خطأ أثناء البحث عن المدينة!');
  }
}

// Get User Geolocation
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        currentCoords = { lat, lon, name: 'موقعك الحالي' };
        fetchWeatherData(lat, lon, 'موقعك الحالي');
      },
      () => alert('تعذر الوصول إلى موقعك الحركي.')
    );
  }
}

// Fetch Weather & Air Quality Data
async function fetchWeatherData(lat, lon, cityName) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi`;

  try {
    const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
    const wData = await wRes.json();
    const aData = await aRes.json();

    renderUI(wData, aData, cityName);
  } catch (err) {
    console.error('Error fetching weather data:', err);
  }
}

// Render UI Components
function renderUI(weather, aqi, cityName) {
  const current = weather.current;
  const daily = weather.daily;
  const hourly = weather.hourly;

  // 1. Hero Card Update
  document.getElementById('cityName').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${cityName}`;
  document.getElementById('mainTemp').textContent = Math.round(convertTemp(current.temperature_2m));
  document.getElementById('feelsLike').textContent = `${Math.round(convertTemp(current.apparent_temperature))}°`;
  document.getElementById('maxTemp').textContent = `${Math.round(convertTemp(daily.temperature_2m_max[0]))}°`;
  document.getElementById('minTemp').textContent = `${Math.round(convertTemp(daily.temperature_2m_min[0]))}°`;

  const info = weatherMap[current.weather_code] || { desc: 'معتدل', icon: 'fa-cloud', color: '#fff' };
  document.getElementById('weatherStateTag').textContent = info.desc;
  
  const heroIcon = document.getElementById('heroIcon');
  heroIcon.className = `fa-solid ${info.icon} weather-main-icon`;
  heroIcon.style.color = info.color;

  // 2. Metrics Grid
  document.getElementById('humidityVal').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('windSpeedVal').textContent = `${current.wind_speed_10m} كم/س`;
  document.getElementById('pressureVal').textContent = `${Math.round(current.surface_pressure)} hPa`;
  document.getElementById('uvVal').textContent = hourly.uv_index[0] || 0;
  document.getElementById('visibilityVal').textContent = `${((hourly.visibility[0] || 10000) / 1000).toFixed(1)} كم`;
  document.getElementById('popVal').textContent = `${hourly.precipitation_probability[0] || 0}%`;

  // 3. Sun Times & Arc
  if(daily.sunrise && daily.sunset) {
    const sRise = new Date(daily.sunrise[0]);
    const sSet = new Date(daily.sunset[0]);
    document.getElementById('sunriseTime').textContent = sRise.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunsetTime').textContent = sSet.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    // Position Sun Arc Icon
    const now = new Date();
    let progress = (now - sRise) / (sSet - sRise);
    progress = Math.max(0, Math.min(1, progress));
    document.getElementById('sunIndicator').style.left = `${progress * 100}%`;
  }

  // 4. AQI Card
  if (aqi && aqi.current) {
    const aqiScore = aqi.current.european_aqi || 20;
    document.getElementById('aqiNumber').textContent = aqiScore;
    document.getElementById('pm25Val').textContent = aqi.current.pm2_5 || '--';
    document.getElementById('pm10Val').textContent = aqi.current.pm10 || '--';
    document.getElementById('o3Val').textContent = aqi.current.ozone || '--';
    document.getElementById('no2Val').textContent = aqi.current.nitrogen_dioxide || '--';

    // Update Circular Gauge (Max AQI ~100)
    const strokeDash = 251 - (251 * Math.min(aqiScore, 100)) / 100;
    const gaugeFill = document.getElementById('aqiGaugeFill');
    gaugeFill.style.strokeDashoffset = strokeDash;

    let statusText = 'ممتاز';
    let statusColor = '#38ef7d';
    if(aqiScore > 20) { statusText = 'جيد'; statusColor = '#00d2ff'; }
    if(aqiScore > 40) { statusText = 'متوسط'; statusColor = '#ff9900'; }
    if(aqiScore > 60) { statusText = 'سيء'; statusColor = '#ff007f'; }
    
    document.getElementById('aqiStatus').textContent = statusText;
    document.getElementById('aqiStatus').style.color = statusColor;
    gaugeFill.style.stroke = statusColor;
  }

  // 5. Render Hourly Chart
  renderChart(hourly);

  // 6. Render Weekly Forecast
  renderWeekly(daily);
}

// Chart.js Rendering
function renderChart(hourly) {
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  
  const labels = hourly.time.slice(0, 24).map(t => new Date(t).getHours() + ':00');
  const temps = hourly.temperature_2m.slice(0, 24).map(t => Math.round(convertTemp(t)));

  if (chartInstance) chartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255, 126, 71, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 126, 71, 0.0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'درجة الحرارة',
        data: temps,
        borderColor: '#ff7e47',
        borderWidth: 3,
        fill: true,
        backgroundColor: gradient,
        tension: 0.4,
        pointBackgroundColor: '#ff7e47',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 10 } } }
      }
    }
  });
}

// Render Weekly Cards
function renderWeekly(daily) {
  const container = document.getElementById('weeklyForecast');
  container.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
    const code = daily.weather_code[i];
    const info = weatherMap[code] || { icon: 'fa-sun', color: '#ffd166' };
    const max = Math.round(convertTemp(daily.temperature_2m_max[i]));
    const min = Math.round(convertTemp(daily.temperature_2m_min[i]));

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <span class="day-name">${dayName}</span>
      <i class="fa-solid ${info.icon} day-icon" style="color:${info.color}"></i>
      <div class="day-temp">
        <span>${max}°</span>
        <small>/ ${min}°</small>
      </div>
    `;
    container.appendChild(card);
  }
}

// Unit Helpers
function convertTemp(celsius) {
  return currentUnit === 'F' ? (celsius * 9/5) + 32 : celsius;
}

function toggleUnit() {
  currentUnit = currentUnit === 'C' ? 'F' : 'C';
  document.getElementById('unitText').textContent = `°${currentUnit}`;
  fetchWeatherData(currentCoords.lat, currentCoords.lon, currentCoords.name);
}