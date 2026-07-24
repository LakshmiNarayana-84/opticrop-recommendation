const form = document.getElementById('predictionForm');
const resultDiv = document.getElementById('result');
const weatherStatus = document.getElementById('weatherStatus');
const detectWeatherButton = document.getElementById('detectWeatherButton');
const temperatureInput = document.getElementById('temperature');
const humidityInput = document.getElementById('humidity');

function renderComparisonChart(crops, scores, recommendedCrop) {
    localStorage.setItem('chartData', JSON.stringify({
        crops,
        scores,
        recommendedCrop,
    }));

    window.open('/graph.html', 'cropComparison', 'width=1000,height=700,resizable=yes,scrollbars=yes');
}

async function loadLocalWeather() {
    if (!navigator.geolocation) {
        weatherStatus.textContent = 'Geolocation not supported in this browser.';
        weatherStatus.className = 'alert error';
        return;
    }

    weatherStatus.textContent = 'Locating you and fetching current temperature...';
    weatherStatus.className = 'alert info';

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`);
            const weather = await response.json();
            if (!response.ok || !weather.current_weather) {
                throw new Error(weather.reason || 'Unable to fetch weather');
            }

            const currentTemp = weather.current_weather.temperature;
            temperatureInput.value = currentTemp;

            if (weather.hourly && weather.hourly.time && weather.hourly.relativehumidity_2m) {
                const currentHour = weather.current_weather.time;
                const index = weather.hourly.time.indexOf(currentHour);
                if (index !== -1) {
                    humidityInput.value = weather.hourly.relativehumidity_2m[index];
                }
            }

            weatherStatus.textContent = `Location weather applied: ${currentTemp}°C${humidityInput.value ? `, humidity ${humidityInput.value}%` : ''}.`;
            weatherStatus.className = 'alert info';
        } catch (error) {
            weatherStatus.textContent = `Weather fetch failed: ${error.message}`;
            weatherStatus.className = 'alert error';
        }
    }, () => {
        weatherStatus.textContent = 'Location access denied or unavailable. Enter temperature manually.';
        weatherStatus.className = 'alert error';
    }, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
    });
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resultDiv.className = 'result-card';

    const payload = {
        N: document.getElementById('N').value,
        P: document.getElementById('P').value,
        K: document.getElementById('K').value,
        temperature: document.getElementById('temperature').value,
        humidity: document.getElementById('humidity').value,
        ph: document.getElementById('ph').value,
        rainfall: document.getElementById('rainfall').value,
    };

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Prediction failed');
        }

        resultDiv.innerHTML = `<p class="result-title">Recommended crop: <strong>${data.crop}</strong></p>`;
        resultDiv.classList.add('success');

        if (data.comparison && data.comparison.crops && data.comparison.scores) {
            renderComparisonChart(data.comparison.crops, data.comparison.scores, data.crop);
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="result-title">${error.message}</p>`;
        resultDiv.classList.add('error');
    }
});

detectWeatherButton.addEventListener('click', loadLocalWeather);
loadLocalWeather();

const openGuideButton = document.getElementById('openGuideButton');
const guideModalOverlay = document.getElementById('guideModal');
const closeGuideButton = document.getElementById('closeGuide');

if (openGuideButton && guideModalOverlay) {
    openGuideButton.addEventListener('click', () => {
        guideModalOverlay.classList.add('active');
        guideModalOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    });
}

if (closeGuideButton && guideModalOverlay) {
    closeGuideButton.addEventListener('click', () => {
        guideModalOverlay.classList.remove('active');
        guideModalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    });
}

if (guideModalOverlay) {
    guideModalOverlay.addEventListener('click', (e) => {
        if (e.target === guideModalOverlay) {
            guideModalOverlay.classList.remove('active');
            guideModalOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    });
}
