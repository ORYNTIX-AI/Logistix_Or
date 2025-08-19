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
    // Find port codes from names or direct codes
    const findPortByNameOrCode = (input) => {
      return ports.find(p => 
        p.name.toLowerCase() === input.toLowerCase() ||
        p.city.toLowerCase() === input.toLowerCase() ||
        p.code.toLowerCase() === input.toLowerCase() ||
        p.name.toLowerCase().includes(input.toLowerCase()) ||
        p.city.toLowerCase().includes(input.toLowerCase())
      );
    };
    
    const originPort = findPortByNameOrCode(searchData.origin_port);
    const destPort = findPortByNameOrCode(searchData.destination_port);
    
    if (!originPort) {
      alert(`Порт отправления "${searchData.origin_port}" не найден. Пожалуйста, выберите из предложенных вариантов.`);
      return;
    }
    
    if (!destPort) {
      alert(`Порт назначения "${searchData.destination_port}" не найден. Пожалуйста, выберите из предложенных вариантов.`);
      return;
    }
    
    const finalSearchData = {
      ...searchData,
      origin_port: originPort.code,
      destination_port: destPort.code
    };
    
    console.log('Search data being sent:', finalSearchData);
    onSearch(finalSearchData);
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

  const handleOriginChange = (value) => {
    handleChange('origin_port', value);
    const suggestions = filterPorts(value, searchData.destination_port);
    setOriginSuggestions(suggestions);
    setShowOriginSuggestions(value.length > 0 && suggestions.length > 0);
  };

  const handleDestChange = (value) => {
    handleChange('destination_port', value);
    const suggestions = filterPorts(value, searchData.origin_port);
    setDestSuggestions(suggestions);
    setShowDestSuggestions(value.length > 0 && suggestions.length > 0);
  };

  const selectOriginPort = (port) => {
    handleChange('origin_port', port.code); // Store port code instead of name
    setShowOriginSuggestions(false);
  };

  const selectDestPort = (port) => {
    handleChange('destination_port', port.code); // Store port code instead of name
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
              value={searchData.origin_port}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => handleOriginChange(searchData.origin_port)}
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
              value={searchData.destination_port}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => handleDestChange(searchData.destination_port)}
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
const SearchResults = ({ results, loading }) => {
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
    return null;
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
                
                <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-md">
                  📞 Запросить расчет
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API}/register`, { email });
      setMessage('Регистрация успешна! Теперь вы можете пользоваться сервисом.');
      onRegister(email);
    } catch (error) {
      if (error.response?.status === 400) {
        setMessage('Пользователь с таким email уже существует.');
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
          <p>Подтверждение email не требуется</p>
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
                    Текущий URL по умолчанию: https://tempbust.app.n8n.cloud/webhook/search
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
                  GET {webhookUrl || 'https://example.com/webhook/search'}?origin_port=CTU&destination_port=LED&departure_date_from=2025-07-30&departure_date_to=2025-08-06&container_type=20ft&is_dangerous_cargo=false&containers_count=1
                </code>
              </div>
            </div>
          </div>
        )}
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
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email'));

  const handleSearch = async (searchData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/search`, searchData);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      alert('Ошибка при поиске. Попробуйте еще раз.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleUserRegistration = (email) => {
    localStorage.setItem('user_email', email);
    setUserEmail(email);
    setShowRegistration(false);
  };

  const handleBackFromRegistration = () => {
    setShowRegistration(false);
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
            {userEmail && (
              <span className="text-sm text-gray-600">
                👤 {userEmail}
              </span>
            )}
            {!userEmail && (
              <button
                onClick={() => setShowRegistration(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                <span>Регистрация</span>
              </button>
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
      <SearchResults results={searchResults} loading={loading} />

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
    </div>
  );
};

export default App;