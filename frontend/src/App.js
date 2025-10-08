import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Logo Component
const Logo = ({ size = "normal", onClick }) => {
  const logoClass = size === "small" ? "h-8 w-8" : "h-12 w-12";
  
  const logoElement = (
    <div className="flex items-center space-x-3">
      <div className={`${logoClass} bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg`}>
        <svg className="w-2/3 h-2/3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.5 8H20l-1 9H6.5L7.5 8zM7.5 8L6 4H3"/>
        </svg>
      </div>
      <div className="text-blue-600 font-bold text-xl">
        Cargo<span className="text-blue-800">Search</span>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div onClick={onClick} className="cursor-pointer hover:opacity-80 transition-opacity">
        {logoElement}
      </div>
    );
  }

  return logoElement;
};

// Search Form Component
const SearchForm = ({ onSearch, loading }) => {
  const [searchData, setSearchData] = useState({
    origin_port: '',
    destination_port: '',
    departure_date_from: '',
    departure_date_to: '',
    container_type: '',
    is_dangerous_cargo: false,
    containers_count: 1,
    cargo_weight_kg: '',
    cargo_volume_m3: ''
  });
  
  // Display names for user-friendly interface
  const [displayNames, setDisplayNames] = useState({
    origin_port_display: '',
    destination_port_display: ''
  });

  const [ports, setPorts] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [portsRes, containerRes] = await Promise.all([
        axios.get(`${API}/ports`),
        axios.get(`${API}/container-types`)
      ]);
      setPorts(portsRes.data);
      setContainerTypes(containerRes.data);
      console.log('Loaded data:', { ports: portsRes.data.length, containers: containerRes.data.length });
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation - just check if ports are selected (should be codes now)
    // старая версия валидации 
    // if (!searchData.origin_port || searchData.origin_port.length < 2) {
    //   alert('Пожалуйста, выберите станцию отправления из списка');
    //   return;
    // }
    
    // if (!searchData.destination_port || searchData.destination_port.length < 2) {
    //   alert('Пожалуйста, выберите станцию назначения из списка');
    //   return;
    // }

    // новая версия валидации
    if (!searchData.origin_port || searchData.origin_port.length < 2) {
      alert('Введите корректную станцию отправления');
      return;
    }

    if (!searchData.destination_port || searchData.destination_port.length < 2) {
      alert('Введите корректную станцию назначения');
      return;
    }

    
    if (searchData.origin_port === searchData.destination_port) {
      alert('Станция отправления и назначения не могут совпадать');
      return;
    }
    
    // Ensure all required fields are included with proper defaults
    const submitData = {
      origin_port: searchData.origin_port,
      destination_port: searchData.destination_port,
      departure_date_from: searchData.departure_date_from,
      departure_date_to: searchData.departure_date_to,
      container_type: searchData.container_type,
      is_dangerous_cargo: Boolean(searchData.is_dangerous_cargo),
      containers_count: parseInt(searchData.containers_count) || 1,
      cargo_weight_kg: searchData.cargo_weight_kg ? parseInt(searchData.cargo_weight_kg) : null,
      cargo_volume_m3: searchData.cargo_volume_m3 ? parseInt(searchData.cargo_volume_m3) : null
    };
    
    console.log('Search data being sent:', submitData);
    onSearch(submitData);
  };

  const handleChange = (field, value) => {
    setSearchData(prev => ({ ...prev, [field]: value }));
  };

  const filterPorts = (input, excludePort = '') => {
    if (!input) return [];
    return ports.filter(port => {
      const matchesSearch = port.name.toLowerCase().includes(input.toLowerCase()) ||
                           port.city.toLowerCase().includes(input.toLowerCase()) ||
                           port.country.toLowerCase().includes(input.toLowerCase()) ||
                           port.code.toLowerCase().includes(input.toLowerCase());
      
      const matchesTransport = port.transport_types.includes("ЖД"); // Only railway stations
      
      return matchesSearch && matchesTransport && port.code !== excludePort;
    }).slice(0, 8);
  };
  // старя версия:
  // const handleOriginChange = (value) => {
  //   setDisplayNames(prev => ({ ...prev, origin_port_display: value })); // Update display
  //   // Clear the actual port code when user starts typing
  //   if (value !== displayNames.origin_port_display) {
  //     handleChange('origin_port', ''); 
  //   }
  //   const suggestions = filterPorts(value, searchData.destination_port);
  //   setOriginSuggestions(suggestions);
  //   setShowOriginSuggestions(value.length > 0 && suggestions.length > 0);
  // };

  // const handleDestChange = (value) => {
  //   setDisplayNames(prev => ({ ...prev, destination_port_display: value })); // Update display  
  //   // Clear the actual port code when user starts typing
  //   if (value !== displayNames.destination_port_display) {
  //     handleChange('destination_port', '');
  //   }
  //   const suggestions = filterPorts(value, searchData.origin_port);
  //   setDestSuggestions(suggestions);
  //   setShowDestSuggestions(value.length > 0 && suggestions.length > 0);
  // };

  // Новая версия: хранить сам текст
  const handleOriginChange = (value) => {
    setDisplayNames(prev => ({ ...prev, origin_port_display: value }));
    handleChange('origin_port', value); // сохраняем текст, а не только код
    const suggestions = filterPorts(value, searchData.destination_port);
    setOriginSuggestions(suggestions);
    setShowOriginSuggestions(value.length > 0 && suggestions.length > 0);
  };

  const handleDestChange = (value) => {
    setDisplayNames(prev => ({ ...prev, destination_port_display: value }));
    handleChange('destination_port', value); // сохраняем текст
    const suggestions = filterPorts(value, searchData.origin_port);
    setDestSuggestions(suggestions);
    setShowDestSuggestions(value.length > 0 && suggestions.length > 0);
  };



  const selectOriginPort = (port) => {
    handleChange('origin_port', port.code); // Store port code for API
    setDisplayNames(prev => ({ ...prev, origin_port_display: port.name })); // Store display name
    setShowOriginSuggestions(false);
  };

  const selectDestPort = (port) => {
    handleChange('destination_port', port.code); // Store port code for API
    setDisplayNames(prev => ({ ...prev, destination_port_display: port.name })); // Store display name
    setShowDestSuggestions(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-8 -mt-20 relative z-10 mx-4 max-w-6xl">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-lg">
          <span className="text-2xl">🚂</span>
          <span className="font-semibold text-blue-800">Железнодорожные перевозки</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Станция отправления
            </label>
            <input
              type="text"
              value={displayNames.origin_port_display}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => handleOriginChange(displayNames.origin_port_display)}
              onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
              placeholder="Введите станцию (например: Чэнду)"
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
            {showOriginSuggestions && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {originSuggestions.map(port => (
                  <div
                    key={port.id}
                    onClick={() => selectOriginPort(port)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800">{port.name}</div>
                        <div className="text-sm text-gray-600">{port.city}, {port.country} ({port.code})</div>
                      </div>
                      <div className="text-lg">🚂</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Станция назначения
            </label>
            <input
              type="text"
              value={displayNames.destination_port_display}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => handleDestChange(displayNames.destination_port_display)}
              onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
              placeholder="Введите станцию (например: Минск)"
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
            {showDestSuggestions && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {destSuggestions.map(port => (
                  <div
                    key={port.id}
                    onClick={() => selectDestPort(port)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800">{port.name}</div>
                        <div className="text-sm text-gray-600">{port.city}, {port.country} ({port.code})</div>
                      </div>
                      <div className="text-lg">🚂</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            Диапазон дат отправления
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={searchData.departure_date_from}
              onChange={(e) => handleChange('departure_date_from', e.target.value)}
              className="p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              required
            />
            <input
              type="date"
              value={searchData.departure_date_to}
              onChange={(e) => handleChange('departure_date_to', e.target.value)}
              className="p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Container and Cargo Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Размер контейнера
            </label>
            <select
              value={searchData.container_type}
              onChange={(e) => handleChange('container_type', e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">Выберите размер</option>
              {containerTypes.map(container => (
                <option key={container.id} value={container.name}>
                  {container.name} ({container.capacity_m3}м³)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Количество контейнеров
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={searchData.containers_count}
              onChange={(e) => handleChange('containers_count', parseInt(e.target.value))}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center">
            <div className="flex items-center space-x-3 bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <input
                type="checkbox"
                id="dangerous_cargo"
                checked={searchData.is_dangerous_cargo}
                onChange={(e) => handleChange('is_dangerous_cargo', e.target.checked)}
                className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="dangerous_cargo" className="text-sm font-semibold text-orange-700">
                ⚠️ Опасный груз
              </label>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Вес груза (кг)
            </label>
            <input
              type="number"
              placeholder="Введите вес груза"
              value={searchData.cargo_weight_kg}
              onChange={(e) => handleChange('cargo_weight_kg', e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Объем груза (м³)
            </label>
            <input
              type="number"
              placeholder="Введите объем груза"
              value={searchData.cargo_volume_m3}
              onChange={(e) => handleChange('cargo_volume_m3', e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Search Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={loading}
            className={`px-12 py-4 text-white font-bold text-lg rounded-lg transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? 'Отправка запроса...' : '🚂 Найти железнодорожную перевозку'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Search Results Component
const SearchResults = ({ results, loading, onBooking }) => {
  // Debug info
  console.log('SearchResults component - results:', results);
  console.log('SearchResults component - loading:', loading);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Отправка запроса и получение результатов...</p>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p>Результаты поиска не найдены или не загрузились.</p>
            <p className="text-sm mt-2">Попробуйте изменить параметры поиска.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        📋 Результаты поиска железнодорожных перевозок
      </h2>
      
      {/* Display webhook response */}
      <div className="space-y-6">
        {Array.isArray(results) ? results.map((result, index) => (
          <div key={result.id || index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* Route Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <span className="text-2xl">🚂</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {result.origin_port} → {result.destination_port}
                    </h3>
                    <p className="text-gray-600">Перевозчик: {result.carrier || 'RZD Express'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Отправление</p>
                    <p className="font-semibold">{result.departure_date_range || 'По запросу'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Тип контейнера</p>
                    <p className="font-semibold">{result.container_type}</p>
                  </div>
                </div>
                
                {result.is_dangerous_cargo && (
                  <div className="mt-3 bg-orange-100 border border-orange-300 rounded-lg p-2">
                    <p className="text-orange-700 text-sm font-semibold">⚠️ Опасный груз - требуются спец. разрешения</p>
                  </div>
                )}
              </div>

              {/* Transit Info */}
              <div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 text-sm">Время доставки</p>
                    <p className="font-semibold">{result.transit_time_days || '15'} дней</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Доступно контейнеров</p>
                    <p className="font-semibold text-green-600">{result.available_containers || '5+'}</p>
                  </div>
                  {result.webhook_error && (
                    <div className="bg-yellow-100 p-2 rounded text-xs text-yellow-700">
                      Тестовые данные (webhook недоступен)
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Booking */}
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-gray-500 text-sm">Цена от</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${(result.price_from_usd || 950).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm">USD за весь груз</p>
                </div>
                
                <button 
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-md"
                  onClick={() => onBooking(result)}>
                  📞 Забронировать
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  Железнодорожная доставка
                </p>
              </div>
            </div>
            
            {/* Raw webhook response for debugging */}
            {process.env.NODE_ENV === 'development' && result.raw_response && (
              <details className="mt-4 p-3 bg-gray-50 rounded">
                <summary className="text-sm text-gray-600 cursor-pointer">Ответ вебхука (debug)</summary>
                <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </details>
            )}
          </div>
        )) : (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Ответ от сервиса</h3>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// User Registration Component
const UserRegistration = ({ onRegister, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Client-side validation
    if (password !== confirmPassword) {
      setMessage('Пароли не совпадают.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage('Пароль должен содержать минимум 6 символов.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/register`, { email, password, confirm_password: confirmPassword });
      setMessage('Регистрация успешна! Теперь вы можете войти в систему.');
      // Auto-login after registration
      try {
        const loginResponse = await axios.post(`${API}/login`, { email, password });
        localStorage.setItem('userToken', loginResponse.data.access_token);
        onRegister(email, loginResponse.data.access_token);
      } catch (loginError) {
        onRegister(email);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.detail;
        if (errorMessage === "Passwords do not match") {
          setMessage('Пароли не совпадают.');
        } else if (errorMessage === "Password must be at least 6 characters long") {
          setMessage('Пароль должен содержать минимум 6 символов.');
        } else if (errorMessage === "User already exists") {
          setMessage('Пользователь с таким email уже существует.');
        } else {
          setMessage(errorMessage);
        }
      } else {
        setMessage('Ошибка при регистрации. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Регистрация</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 p-2"
            title="Назад"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="mb-6 text-center text-gray-600">
          <p>Зарегистрируйтесь для получения доступа к поиску железнодорожных перевозок</p>
        </div>

        {message && (
          <div className={`p-4 rounded mb-4 ${
            message.includes('успешна') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email адрес
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="example@mail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Введите пароль"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Подтвердите пароль"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-lg transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Пароль должен содержать минимум 6 символов</p>
        </div>
      </div>
    </div>
  );
};

// User Login Component
const UserLogin = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem('userToken', response.data.access_token);
      setMessage('Вход выполнен успешно!');
      onLogin(email, response.data.access_token);
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage('Неверный email или пароль.');
      } else {
        setMessage('Ошибка при входе. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Вход в систему</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 p-2"
            title="Назад"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="mb-6 text-center text-gray-600">
          <p>Войдите в свой аккаунт для доступа к поиску перевозок</p>
        </div>

        {message && (
          <div className={`p-4 rounded mb-4 ${
            message.includes('успешно') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email адрес
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="example@mail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Введите пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-lg transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Нет аккаунта? <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">Зарегистрироваться</button></p>
        </div>
      </div>
    </div>
  );
};

// Admin Login Component
const AdminLogin = ({ onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/admin/login`, credentials);
      localStorage.setItem('admin_token', response.data.access_token);
      onLogin(response.data.access_token);
    } catch (error) {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Вход в админ-панель</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 p-2"
            title="Назад"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Логин
            </label>
            <input
              type="text"
              value={credentials.login}
              onChange={(e) => setCredentials(prev => ({ ...prev, login: e.target.value }))}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="admin123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-lg transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Panel Component  
const AdminPanel = ({ token, onLogout, onBack }) => {
  const [activeTab, setActiveTab] = useState('containers');
  const [containerTypes, setContainerTypes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState('');

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchAdminData();
    fetchWebhookSettings();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [containerRes, routesRes] = await Promise.all([
        axios.get(`${API}/admin/container-types`, authHeaders),
        axios.get(`${API}/admin/routes`, authHeaders)
      ]);
      setContainerTypes(containerRes.data);
      setRoutes(routesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных админки:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/webhook`, authHeaders);
      setWebhookUrl(response.data.webhook_url);
    } catch (error) {
      console.error('Ошибка загрузки настроек вебхука:', error);
    }
  };

  const saveWebhookSettings = async () => {
    if (!webhookUrl.trim()) {
      setWebhookMessage('URL вебхука не может быть пустым');
      return;
    }

    try {
      await axios.post(`${API}/admin/webhook`, { webhook_url: webhookUrl }, authHeaders);
      setWebhookMessage('Настройки вебхука успешно сохранены');
      setTimeout(() => setWebhookMessage(''), 3000);
    } catch (error) {
      setWebhookMessage('Ошибка при сохранении настроек вебхука');
      setTimeout(() => setWebhookMessage(''), 3000);
    }
  };

  const deleteContainerType = async (id) => {
    if (window.confirm('Удалить тип контейнера?')) {
      try {
        await axios.delete(`${API}/admin/container-types/${id}`, authHeaders);
        fetchAdminData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const deleteRoute = async (id) => {
    if (window.confirm('Удалить маршрут?')) {
      try {
        await axios.delete(`${API}/admin/routes/${id}`, authHeaders);
        fetchAdminData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo size="small" onClick={onBack} />
            <h1 className="text-2xl font-bold">Админ-панель</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              <span>Назад</span>
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('containers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'containers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Типы контейнеров
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'routes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Маршруты
              </button>
              <button
                onClick={() => setActiveTab('webhook')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'webhook'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔗 Настройки вебхука
              </button>
            </nav>
          </div>
        </div>

        {/* Container Types Tab */}
        {activeTab === 'containers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Типы контейнеров</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Название</th>
                      <th className="px-4 py-2 text-left">Размер</th>
                      <th className="px-4 py-2 text-left">Объем (м³)</th>
                      <th className="px-4 py-2 text-left">Макс. вес (кг)</th>
                      <th className="px-4 py-2 text-left">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containerTypes.map(container => (
                      <tr key={container.id} className="border-b">
                        <td className="px-4 py-2">{container.name}</td>
                        <td className="px-4 py-2">{container.size}</td>
                        <td className="px-4 py-2">{container.capacity_m3}</td>
                        <td className="px-4 py-2">{container.max_weight_kg.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => deleteContainerType(container.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Маршруты перевозок</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Маршрут</th>
                      <th className="px-4 py-2 text-left">Тип</th>
                      <th className="px-4 py-2 text-left">Перевозчик</th>
                      <th className="px-4 py-2 text-left">Время (дни)</th>
                      <th className="px-4 py-2 text-left">Базовая цена</th>
                      <th className="px-4 py-2 text-left">Частота</th>
                      <th className="px-4 py-2 text-left">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(route => (
                      <tr key={route.id} className="border-b">
                        <td className="px-4 py-2">{route.origin_port} → {route.destination_port}</td>
                        <td className="px-4 py-2">{route.transport_type || 'ЖД'}</td>
                        <td className="px-4 py-2">{route.carrier}</td>
                        <td className="px-4 py-2">{route.transit_time_days}</td>
                        <td className="px-4 py-2">${route.base_price_usd}</td>
                        <td className="px-4 py-2">{route.frequency}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => deleteRoute(route.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Settings Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">🔗 Настройки вебхука</h3>
              
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Как это работает:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• При поиске перевозки данные отправляются GET запросом на указанный URL</li>
                  <li>• Параметры передаются в query string</li>
                  <li>• Ответ от вебхука отображается пользователю как результат поиска</li>
                  <li>• При недоступности вебхука показываются тестовые данные</li>
                </ul>
              </div>

              {webhookMessage && (
                <div className={`p-4 rounded-lg mb-4 ${
                  webhookMessage.includes('успешно') 
                    ? 'bg-green-100 border border-green-300 text-green-700'
                    : 'bg-red-100 border border-red-300 text-red-700'
                }`}>
                  {webhookMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    URL вебхука
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook/search"
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Текущий URL по умолчанию: https://beautechflow.store/webhook/search
                  </p>
                </div>

                <button
                  onClick={saveWebhookSettings}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  💾 Сохранить настройки вебхука
                </button>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Пример параметров запроса:</h4>
                <code className="text-xs bg-white p-3 rounded border block">
                  GET {webhookUrl || 'https://beautechflow.store/webhook/search'}?from=CTU&to=MSQ&container_size=20&price=5100&ETD=2025-08-01&TT=15
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Booking Modal Component
const BookingModal = ({ 
  isOpen, 
  onClose, 
  selectedRoute, 
  bookingData, 
  setBookingData, 
  onSubmit,
  isSubmitting 
}) => {
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка условий поставки
  useEffect(() => {
    if (isOpen) {
      fetchDeliveryTerms();
    }
  }, [isOpen]);
  
  const fetchDeliveryTerms = async () => {
    try {
      const response = await axios.get(`${API}/delivery-terms`);
      setDeliveryTerms(response.data);
    } catch (error) {
      console.error('Ошибка загрузки условий поставки:', error);
    }
  };
  
  const handleInputChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const fileNames = files.map(file => file.name);
    setBookingData(prev => ({
      ...prev,
      uploaded_files: [...prev.uploaded_files, ...fileNames]
    }));
  };
  
  const removeFile = (fileName) => {
    setBookingData(prev => ({
      ...prev,
      uploaded_files: prev.uploaded_files.filter(name => name !== fileName)
    }));
  };
  
  const validateForm = () => {
    const requiredFields = [
      'company_name', 'contact_name', 'contact_phone', 'sender_phone',
      'factory_address', 'confirmation_email', 'tnved_code', 'delivery_conditions'
    ];
    
    for (const field of requiredFields) {
      if (!bookingData[field]?.trim()) {
        alert(`Пожалуйста, заполните поле: ${getFieldLabel(field)}`);
        return false;
      }
    }
    
    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.confirmation_email)) {
      alert('Пожалуйста, введите корректный email для подтверждения');
      return false;
    }
    
    // Проверка телефонов
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(bookingData.contact_phone)) {
      alert('Пожалуйста, введите корректный телефон контакта');
      return false;
    }
    
    if (!phoneRegex.test(bookingData.sender_phone)) {
      alert('Пожалуйста, введите корректный телефон отправителя');
      return false;
    }
    
    return true;
  };
  
  const getFieldLabel = (field) => {
    const labels = {
      company_name: 'Название компании плательщика',
      contact_name: 'ФИ контакта загрузке',
      contact_phone: 'Телефон контакта',
      sender_phone: 'Телефон отправителя',
      factory_address: 'Адрес фабрики',
      confirmation_email: 'Email для подтверждения',
      tnved_code: 'Код ТНВЭД',
      delivery_conditions: 'Условия поставки'
    };
    return labels[field] || field;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              📋 Бронирование перевозки
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>
          
          {/* Route Info */}
          {selectedRoute && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Выбранный маршрут:</h3>
              <p className="text-sm text-blue-700">
                {selectedRoute.origin_port} → {selectedRoute.destination_port} | 
                {selectedRoute.carrier} | 
                Цена от: ${(selectedRoute.price_from_usd || 950).toLocaleString()} USD
              </p>
            </div>
          )}
          
          {/* Data Collection Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Информация о сборе данных:</strong> Мы собираем ваши данные для обработки заявки на бронирование и организации перевозки. 
                  Данные будут переданы перевозчикам для участия в торгах и предоставления лучших условий.
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Company and Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-3">Информация о компании</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название компании плательщика *
                  </label>
                  <input
                    type="text"
                    value={bookingData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ООО 'Название компании'"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ФИ контакта загрузке *
                  </label>
                  <input
                    type="text"
                    value={bookingData.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Иванов Иван Иванович"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон контакта *
                  </label>
                  <input
                    type="tel"
                    value={bookingData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+7 (900) 123-45-67"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон отправителя *
                  </label>
                  <input
                    type="tel"
                    value={bookingData.sender_phone}
                    onChange={(e) => handleInputChange('sender_phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+7 (900) 987-65-43"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email для подтверждения бронирования *
                  </label>
                  <input
                    type="email"
                    value={bookingData.confirmation_email}
                    onChange={(e) => handleInputChange('confirmation_email', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@company.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              {/* Delivery and Cargo Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-3">Информация о грузе</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Адрес фабрики *
                  </label>
                  <textarea
                    value={bookingData.factory_address}
                    onChange={(e) => handleInputChange('factory_address', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Полный адрес фабрики с индексом"
                    rows="3"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Код ТНВЭД *
                  </label>
                  <input
                    type="text"
                    value={bookingData.tnved_code}
                    onChange={(e) => handleInputChange('tnved_code', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234567890"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Условия поставки *
                  </label>
                  <input
                    type="text"
                    value={bookingData.delivery_conditions}
                    onChange={(e) => handleInputChange('delivery_conditions', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Описание условий поставки"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                {/* Checkbox for delivery terms change */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="change_delivery_terms"
                    checked={bookingData.change_delivery_terms}
                    onChange={(e) => handleInputChange('change_delivery_terms', e.target.checked)}
                    className="rounded border-gray-300 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="change_delivery_terms" className="text-sm font-medium text-gray-700">
                    Изменение условия поставки
                  </label>
                </div>
                
                {/* Dropdown for delivery terms (visible when checkbox is checked) */}
                {bookingData.change_delivery_terms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Выберите условия поставки
                    </label>
                    <select
                      value={bookingData.delivery_terms}
                      onChange={(e) => handleInputChange('delivery_terms', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Выберите условие поставки...</option>
                      {deliveryTerms.map(term => (
                        <option key={term.code} value={term.code}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* File upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Загрузка файлов
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  
                  {/* Uploaded files list */}
                  {bookingData.uploaded_files.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Загруженные файлы:</p>
                      <div className="space-y-1">
                        {bookingData.uploaded_files.map((fileName, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                            <span className="text-sm text-gray-700 truncate">{fileName}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(fileName)}
                              className="text-red-500 hover:text-red-700 ml-2"
                              disabled={isSubmitting}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Submit buttons */}
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Отменить
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));
  const [userToken, setUserToken] = useState(localStorage.getItem('userToken'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email'));

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  
  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [bookingData, setBookingData] = useState({
    company_name: '',
    contact_name: '',
    contact_phone: '',
    sender_phone: '',
    factory_address: '',
    confirmation_email: userEmail || '',
    change_delivery_terms: false,
    delivery_terms: '',
    tnved_code: '',
    delivery_conditions: '',
    uploaded_files: []
  });


  const handleSearch = async (searchData) => {
    console.log('🔍 Frontend handleSearch called with:', searchData);
    setLoading(true);
    try {
      const response = await axios.post(`${API}/search`, searchData);
      console.log('✅ Search response received:', response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error('❌ Search error:', error);
      console.error('❌ Error response:', error.response?.data);
      alert('Ошибка при поиске. Попробуйте еще раз.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (result) => {
    if (!userEmail) {
      alert("Пожалуйста, авторизуйтесь или зарегистрируйтесь, чтобы забронировать.");
      return;
    }
    
    setSelectedRoute(result);
    setBookingData(prev => ({
      ...prev,
      confirmation_email: userEmail
    }));
    setShowBookingModal(true);
  };

  // States for booking animation
  const [showBookingAnimation, setShowBookingAnimation] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingAnimationStep, setBookingAnimationStep] = useState(0);

  const handleBookingSubmit = async () => {
    setIsSubmittingBooking(true);
    
    try {
      // Prepare booking request data
      const bookingRequest = {
        ...bookingData,
        route_id: selectedRoute.id,
        search_query: {
          origin_port: selectedRoute.origin_port,
          destination_port: selectedRoute.destination_port,
          carrier: selectedRoute.carrier,
          price_from_usd: selectedRoute.price_from_usd
        }
      };

      console.log('Submitting booking request:', bookingRequest);

      const response = await axios.post(`${API}/booking`, bookingRequest, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Booking response:', response.data);

      // Close booking modal
      setShowBookingModal(false);
      
      // Show animation
      setShowBookingAnimation(true);
      setBookingAnimationStep(0);
      
      // Animate the bidding process steps
      const animationSteps = [
        "Отправляем уведомления перевозчикам...",
        "Получаем предложения от перевозчиков...", 
        "Выбираем лучшее предложение...",
        "Уведомляем победителя торгов...",
        "Отправляем данные клиенту..."
      ];
      
      for (let i = 0; i < animationSteps.length; i++) {
        setTimeout(() => {
          setBookingAnimationStep(i);
        }, i * 2000);
      }
      
      // Show final success message
      setTimeout(() => {
        setShowBookingAnimation(false);
        setPopupMessage(`✅ Заявка успешно отправлена! Торги стартовали. Ожидайте результаты на почту ${bookingData.confirmation_email}`);
        setShowPopup(true);
        
        // Reset form
        setBookingData({
          company_name: '',
          contact_name: '',
          contact_phone: '',
          sender_phone: '',
          factory_address: '',
          confirmation_email: userEmail || '',
          change_delivery_terms: false,
          delivery_terms: '',
          tnved_code: '',
          delivery_conditions: '',
          uploaded_files: []
        });
      }, animationSteps.length * 2000 + 1000);

    } catch (error) {
      console.error('Booking submission error:', error);
      alert(`❌ Ошибка при отправке заявки: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // ___________________________________________________________________________

  // Booking Animation Component - показывает процесс торгов
  const BookingAnimation = ({ isVisible, currentStep }) => {
    const steps = [
      {
        title: "Отправляем уведомления перевозчикам",
        description: "Уведомляем перевозчиков через WhatsApp о запросе снижения цены",
        icon: "📱"
      },
      {
        title: "Получаем предложения от перевозчиков", 
        description: "Перевозчики отправляют свои лучшие предложения",
        icon: "📋"
      },
      {
        title: "Выбираем лучшее предложение",
        description: "Анализируем все предложения и выбираем самую выгодную цену",
        icon: "🎯"
      },
      {
        title: "Уведомляем победителя торгов",
        description: "Сообщаем победившему перевозчику и передаем ваши данные",
        icon: "🏆"
      },
      {
        title: "Отправляем данные клиенту",
        description: "Высылаем вам контакты победителя и окончательную цену",
        icon: "📧"
      }
    ];

    if (!isVisible) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🔄 Процесс торгов запущен</h2>
            <p className="text-gray-600">Идет обработка вашей заявки...</p>
          </div>
          
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isUpcoming = index > currentStep;
              
              return (
                <div key={index} className={`flex items-center p-4 rounded-lg transition-all duration-500 ${
                  isActive ? 'bg-blue-100 border-2 border-blue-300 scale-105' : 
                  isCompleted ? 'bg-green-50 border border-green-200' : 
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className={`text-2xl mr-4 transition-all duration-300 ${
                    isActive ? 'animate-pulse' : ''
                  }`}>
                    {isCompleted ? '✅' : step.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      isActive ? 'text-blue-800' : 
                      isCompleted ? 'text-green-800' : 
                      'text-gray-600'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${
                      isActive ? 'text-blue-600' : 
                      isCompleted ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {isActive && (
                    <div className="ml-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <div className="ml-4 text-green-500 font-bold">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Примерное время:</strong> 3-15 минут. Вы получите уведомление на почту после завершения торгов.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Popup = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 relative max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()} // чтобы клик внутри не закрывал
      >
        {/* Крестик */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>
        
        {/* Сообщение */}
        <p className="text-lg font-semibold mb-6">{message}</p>
        
        {/* Кнопка OK */}
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          OK!
        </button>
      </div>
    </div>
  );
  };

  // ___________________________________________________________________________


  const handleAdminLogin = (token) => {
    setAdminToken(token);
    setShowAdmin(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setShowAdmin(false);
  };

  const handleBackFromAdmin = () => {
    setShowAdmin(false);
  };

  const handleUserRegistration = (email, token = null) => {
    localStorage.setItem('user_email', email);
    setUserEmail(email);
    if (token) {
      setUserToken(token);
      localStorage.setItem('userToken', token);
    }
    setShowRegistration(false);
  };

  const handleUserLogin = (email, token) => {
    localStorage.setItem('user_email', email);
    setUserEmail(email);
    setUserToken(token);
    localStorage.setItem('userToken', token);
    setShowUserLogin(false);
  };

  const handleUserLogout = () => {
    setUserEmail('');
    setUserToken(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('user_email');
  };

  const handleBackFromRegistration = () => {
    setShowRegistration(false);
  };

  const handleBackFromUserLogin = () => {
    setShowUserLogin(false);
  };

  // Admin panel route
  if (showAdmin && adminToken) {
    return <AdminPanel token={adminToken} onLogout={handleAdminLogout} />;
  }

  // Admin login route
  if (showAdmin && !adminToken) {
    return <AdminLogin onLogin={handleAdminLogin} onBack={handleBackFromAdmin} />;
  }

  // Registration route
  if (showRegistration) {
    return <UserRegistration onRegister={handleUserRegistration} onBack={handleBackFromRegistration} />;
  }

  // User login route
  if (showUserLogin) {
    return <UserLogin onLogin={handleUserLogin} onBack={handleBackFromUserLogin} />;
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo />
            <p className="text-gray-600 hidden md:block">Платформа поиска железнодорожных перевозок</p>
          </div>
          <div className="flex items-center space-x-4">
            {userToken ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  👤 {userEmail}
                </span>
                <button
                  onClick={handleUserLogout}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowUserLogin(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                  <span>Войти</span>
                </button>
                <button
                  onClick={() => setShowRegistration(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                  <span>Регистрация</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setShowAdmin(true)}
              className="text-gray-600 hover:text-blue-600 text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>Админ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat h-96"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://images.unsplash.com/photo-1605745341112-85968b19335b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxjYXJnbyUyMHNoaXB8ZW58MHx8fHwxNzUzMjU0MDY3fDA&ixlib=rb-4.1.0&q=85)'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">
              🚂 Железнодорожные перевозки Китай ↔ СНГ
            </h1>
            <p className="text-xl mb-8 max-w-3xl">
              Найдите оптимальные маршруты для железнодорожных контейнерных перевозок. 
              Быстро, надежно, с лучшими ценами.
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-6xl mx-auto px-4">
        <SearchForm onSearch={handleSearch} loading={loading} />
      </div>

      {/* Search Results */}
      <SearchResults results={searchResults} loading={loading} onBooking={handleBooking} />

      {/* Features Section */}
      {searchResults.length === 0 && !loading && (
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            🚂 Особенности железнодорожных перевозок
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Быстрая доставка</h3>
              <p className="text-gray-600">
                Железнодорожные перевозки в 2-3 раза быстрее морских. Чэнду-Москва за 15 дней.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Оптимальная цена</h3>
              <p className="text-gray-600">
                Железная дорога дешевле авиа и быстрее морского транспорта. Идеальный баланс.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Широкая сеть</h3>
              <p className="text-gray-600">
                160+ станций в Китае и СНГ. Новый шелковый путь объединяет континенты.
              </p>
            </div>
          </div>
          
          <div className="mt-12 bg-blue-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-center mb-6">🛤️ Популярные направления</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Из Китая в СНГ:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>🚂 Чэнду → Москва (15 дней)</li>
                  <li>🚂 Иу → Минск (18 дней)</li>
                  <li>🚂 Сиань → Дуйсбург (16 дней)</li>
                  <li>🚂 Урумчи → Алматы (4 дня)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Обратные направления:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>🚂 Москва → Пекин (10 дней)</li>
                  <li>🚂 Санкт-Петербург → Шанхай (15 дней)</li>
                  <li>🚂 Алматы → Урумчи (4 дня)</li>
                  <li>🚂 Минск → Иу (18 дней)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="mb-4">
                <Logo />
              </div>
              <p className="text-gray-300">
                Специализированная платформа для поиска железнодорожных контейнерных перевозок 
                между Китаем и странами СНГ.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">🚂 Наши услуги</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Железнодорожные контейнерные перевозки</li>
                <li>Маршруты Китай ↔ СНГ</li>
                <li>Опасные и неопасные грузы</li>
                <li>Контейнеры 20ft и 40ft</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">📞 Контакты</h4>
              <div className="text-gray-300 space-y-2">
                <p>Email: info@cargosearch.com</p>
                <p>Телефон: +7 (495) 123-45-67</p>
                <p>Работаем 24/7</p>
                <p>🚂 Железнодорожные грузоперевозки</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CargoSearch Railway. Железнодорожные перевозки Китай-СНГ.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          selectedRoute={selectedRoute}
          bookingData={bookingData}
          setBookingData={setBookingData}
          onSubmit={handleBookingSubmit}
          isSubmitting={isSubmittingBooking}
        />
      )}

      {/* Booking Animation */}
      <BookingAnimation 
        isVisible={showBookingAnimation} 
        currentStep={bookingAnimationStep} 
      />

      {/* Popup */}
      {showPopup && (
        <Popup message={popupMessage} onClose={() => setShowPopup(false)} />
      )}

    </div>
  );
};

export default App;