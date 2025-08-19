#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CargoSearch Platform
Tests all backend endpoints including authentication and admin functionality
"""

import requests
import json
from datetime import datetime, date, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend API at: {API_BASE}")

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def log_result(self, test_name, success, message=""):
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def test_api_health(self):
        """Test basic API health endpoint"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "CargoSearch API" in data.get("message", ""):
                    self.log_result("API Health Check", True, f"Status: {response.status_code}")
                else:
                    self.log_result("API Health Check", False, f"Unexpected response: {data}")
            else:
                self.log_result("API Health Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
    
    def test_container_types_endpoint(self):
        """Test container types data endpoint"""
        try:
            response = requests.get(f"{API_BASE}/container-types", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if we have expected container types
                    container_names = [c.get('name', '') for c in data]
                    expected_types = ['20ft Standard', '40ft Standard', '40ft High Cube']
                    found_types = [t for t in expected_types if t in container_names]
                    if len(found_types) >= 2:
                        self.log_result("Container Types Endpoint", True, f"Found {len(data)} container types")
                    else:
                        self.log_result("Container Types Endpoint", False, f"Missing expected container types: {container_names}")
                else:
                    self.log_result("Container Types Endpoint", False, f"Empty or invalid response: {data}")
            else:
                self.log_result("Container Types Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Container Types Endpoint", False, f"Error: {str(e)}")
    
    def test_cargo_types_endpoint(self):
        """Test cargo types data endpoint"""
        try:
            response = requests.get(f"{API_BASE}/cargo-types", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    cargo_names = [c.get('name', '') for c in data]
                    expected_cargos = ['Сухие грузы', 'Продукты питания', 'Текстиль']
                    found_cargos = [c for c in expected_cargos if c in cargo_names]
                    if len(found_cargos) >= 2:
                        self.log_result("Cargo Types Endpoint", True, f"Found {len(data)} cargo types")
                    else:
                        self.log_result("Cargo Types Endpoint", False, f"Missing expected cargo types: {cargo_names}")
                else:
                    self.log_result("Cargo Types Endpoint", False, f"Empty or invalid response: {data}")
            else:
                self.log_result("Cargo Types Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Cargo Types Endpoint", False, f"Error: {str(e)}")
    
    def test_ports_endpoint(self):
        """Test ports data endpoint"""
        try:
            response = requests.get(f"{API_BASE}/ports", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    port_codes = [p.get('code', '') for p in data]
                    expected_ports = ['LED', 'NVS', 'BAK', 'SHA', 'HAM']
                    found_ports = [p for p in expected_ports if p in port_codes]
                    if len(found_ports) >= 3:
                        self.log_result("Ports Endpoint", True, f"Found {len(data)} ports including CIS ports")
                    else:
                        self.log_result("Ports Endpoint", False, f"Missing expected ports: {port_codes}")
                else:
                    self.log_result("Ports Endpoint", False, f"Empty or invalid response: {data}")
            else:
                self.log_result("Ports Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Ports Endpoint", False, f"Error: {str(e)}")
    
    def test_search_functionality(self):
        """Test search functionality with various parameters"""
        # Test case 1: Basic search SHA -> LED
        search_data = {
            "origin_port": "SHA",
            "destination_port": "LED", 
            "departure_date_from": (date.today() + timedelta(days=7)).isoformat(),
            "departure_date_to": (date.today() + timedelta(days=14)).isoformat(),
            "container_type": "20ft Standard",
            "cargo_type": "Сухие грузы",
            "containers_count": 1
        }
        
        try:
            response = requests.post(f"{API_BASE}/search", json=search_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check result structure
                        result = data[0]
                        required_fields = ['id', 'origin_port', 'destination_port', 'carrier', 'price_from_usd']
                        missing_fields = [f for f in required_fields if f not in result]
                        if not missing_fields:
                            self.log_result("Search Functionality (SHA->LED)", True, f"Found {len(data)} results with pricing")
                        else:
                            self.log_result("Search Functionality (SHA->LED)", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("Search Functionality (SHA->LED)", False, "No search results returned")
                else:
                    self.log_result("Search Functionality (SHA->LED)", False, f"Invalid response format: {data}")
            else:
                self.log_result("Search Functionality (SHA->LED)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Search Functionality (SHA->LED)", False, f"Error: {str(e)}")
        
        # Test case 2: Different route HAM -> NVS
        search_data2 = {
            "origin_port": "HAM",
            "destination_port": "NVS",
            "departure_date_from": (date.today() + timedelta(days=5)).isoformat(),
            "departure_date_to": (date.today() + timedelta(days=10)).isoformat(),
            "container_type": "40ft Standard",
            "cargo_type": "Продукты питания",
            "containers_count": 2
        }
        
        try:
            response = requests.post(f"{API_BASE}/search", json=search_data2, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Search Functionality (HAM->NVS)", True, f"Found {len(data)} results for multiple containers")
                else:
                    self.log_result("Search Functionality (HAM->NVS)", False, "No results for HAM->NVS route")
            else:
                self.log_result("Search Functionality (HAM->NVS)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Search Functionality (HAM->NVS)", False, f"Error: {str(e)}")
        
        # Test case 3: CIS route IST -> BAK
        search_data3 = {
            "origin_port": "IST",
            "destination_port": "BAK",
            "departure_date_from": (date.today() + timedelta(days=3)).isoformat(),
            "departure_date_to": (date.today() + timedelta(days=7)).isoformat(),
            "container_type": "20ft Standard",
            "cargo_type": "Автозапчасти",
            "containers_count": 1
        }
        
        try:
            response = requests.post(f"{API_BASE}/search", json=search_data3, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Search Functionality (IST->BAK)", True, f"CIS route working with {len(data)} results")
                else:
                    self.log_result("Search Functionality (IST->BAK)", False, "No results for CIS route")
            else:
                self.log_result("Search Functionality (IST->BAK)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Search Functionality (IST->BAK)", False, f"Error: {str(e)}")
    
    def test_admin_authentication(self):
        """Test admin login functionality"""
        login_data = {
            "login": "cargo_admin",
            "password": "Cargo2025!"
        }
        
        try:
            response = requests.post(f"{API_BASE}/admin/login", json=login_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.admin_token = data["access_token"]
                    self.log_result("Admin Authentication", True, "Login successful, token received")
                else:
                    self.log_result("Admin Authentication", False, f"Invalid response format: {data}")
            else:
                self.log_result("Admin Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Error: {str(e)}")
        
        # Test invalid credentials
        invalid_login = {
            "login": "wrong_admin",
            "password": "wrong_password"
        }
        
        try:
            response = requests.post(f"{API_BASE}/admin/login", json=invalid_login, timeout=10)
            if response.status_code == 401:
                self.log_result("Admin Authentication (Invalid Credentials)", True, "Correctly rejected invalid credentials")
            else:
                self.log_result("Admin Authentication (Invalid Credentials)", False, f"Should reject invalid credentials, got: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Authentication (Invalid Credentials)", False, f"Error: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test admin-protected endpoints"""
        if not self.admin_token:
            self.log_result("Admin Endpoints", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test admin container types endpoint
        try:
            response = requests.get(f"{API_BASE}/admin/container-types", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Admin Container Types", True, f"Retrieved {len(data)} container types")
                else:
                    self.log_result("Admin Container Types", False, "Empty container types response")
            else:
                self.log_result("Admin Container Types", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Container Types", False, f"Error: {str(e)}")
        
        # Test admin routes endpoint
        try:
            response = requests.get(f"{API_BASE}/admin/routes", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Admin Routes", True, f"Retrieved {len(data)} shipping routes")
                else:
                    self.log_result("Admin Routes", False, "Empty routes response")
            else:
                self.log_result("Admin Routes", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Routes", False, f"Error: {str(e)}")
        
        # Test unauthorized access (without token)
        try:
            response = requests.get(f"{API_BASE}/admin/container-types", timeout=10)
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Admin Authorization Check", True, "Correctly blocks unauthorized access")
            else:
                self.log_result("Admin Authorization Check", False, f"Should block unauthorized access, got: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Authorization Check", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("CARGOSEARCH BACKEND API TESTING")
        print("=" * 60)
        
        # Test basic functionality
        self.test_api_health()
        self.test_container_types_endpoint()
        self.test_cargo_types_endpoint()
        self.test_ports_endpoint()
        
        # Test search functionality
        self.test_search_functionality()
        
        # Test admin functionality
        self.test_admin_authentication()
        self.test_admin_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\nFAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  - {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)