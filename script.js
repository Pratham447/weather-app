(function () {
  var GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  var WX = 'https://api.open-meteo.com/v1/forecast';

  // Open-Meteo weather codes -> [icon, description]
  var CODES = {
    0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
    45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'],
    51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌦️', 'Heavy drizzle'],
    61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
    71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['🌨️', 'Heavy snow'],
    80: ['🌦️', 'Rain showers'], 81: ['🌧️', 'Heavy showers'], 82: ['⛈️', 'Violent showers'],
    95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm with hail'], 99: ['⛈️', 'Severe thunderstorm']
  };
  function code(c) { return CODES[c] || ['🌡️', 'Unknown']; }

  var form = document.getElementById('search-form');
  var input = document.getElementById('city');
  var btn = form.querySelector('button');
  var msg = document.getElementById('message');
  var cur = document.getElementById('current');
  var fcWrap = document.getElementById('forecast-wrap');

  function say(text, isError) {
    msg.textContent = text;
    msg.className = isError ? 'error' : '';
  }

  // Fetch JSON and throw a clear error for failed requests
  async function getJSON(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('The weather service returned an error (' + res.status + ').');
    return res.json();
  }

  async function loadCity(name) {
    say('Loading weather for ' + name + '...');
    btn.disabled = true;
    try {
      // 1. City name -> coordinates
      var geo = await getJSON(GEO + '?name=' + encodeURIComponent(name) + '&count=1&language=en&format=json');
      if (!geo.results || !geo.results.length) {
        throw new Error('City not found. Check the spelling and try again.');
      }
      var place = geo.results[0];

      // 2. Coordinates -> current weather + daily forecast (nested JSON)
      var url = WX + '?latitude=' + place.latitude + '&longitude=' + place.longitude +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto';
      var data = await getJSON(url);

      show(place, data);
      say('');
      try { localStorage.setItem('last-city', place.name); } catch (e) {}
    } catch (err) {
      cur.hidden = true; fcWrap.hidden = true;
      if (err instanceof TypeError) say('Network problem. Check your internet connection and try again.', true);
      else say(err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function show(place, data) {
    var c = data.current, u = data.current_units, info = code(c.weather_code);
    var where = place.name + (place.admin1 ? ', ' + place.admin1 : '') + (place.country ? ', ' + place.country : '');
    document.getElementById('place').textContent = where;
    document.getElementById('icon').textContent = info[0];
    document.getElementById('temp').textContent = Math.round(c.temperature_2m) + u.temperature_2m;
    document.getElementById('desc').textContent = info[1];
    document.getElementById('feels').textContent = Math.round(c.apparent_temperature) + u.apparent_temperature;
    document.getElementById('humidity').textContent = c.relative_humidity_2m + u.relative_humidity_2m;
    document.getElementById('wind').textContent = c.wind_speed_10m + ' ' + u.wind_speed_10m;
    cur.hidden = false;

    var d = data.daily, list = document.getElementById('forecast');
    list.textContent = '';
    d.time.forEach(function (date, i) {
      var li = document.createElement('li');
      var day = document.createElement('div'); day.className = 'day';
      day.textContent = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      var ic = document.createElement('div'); ic.className = 'ic'; ic.textContent = code(d.weather_code[i])[0];
      var t = document.createElement('div');
      t.textContent = Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°';
      li.append(day, ic, t);
      list.appendChild(li);
    });
    fcWrap.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = input.value.trim();
    if (name) loadCity(name);
  });

  var last = 'Delhi';
  try { last = localStorage.getItem('last-city') || last; } catch (e) {}
  input.value = last;
  loadCity(last);
})();
