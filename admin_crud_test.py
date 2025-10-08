#!/usr/bin/env python3
import requests
import json
import uuid

API_BASE = 'https://env-config-6.preview.emergentagent.com/api'

print("Testing Admin CRUD Operations...")

# First, login to get admin token
login_data = {
    "login": "cargo_admin",
    "password": "Cargo2025!"
}

response = requests.post(f"{API_BASE}/admin/login", json=login_data)
if response.status_code != 200:
    print("❌ Failed to get admin token")
    exit(1)

admin_token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {admin_token}"}

print("✅ Admin token obtained")

# Test creating a new container type
new_container = {
    "id": str(uuid.uuid4()),
    "name": "Test Container 45ft",
    "size": "45ft",
    "capacity_m3": 85.0,
    "max_weight_kg": 30000,
    "description": "Test container for CRUD operations",
    "price_modifier": 1.2
}

response = requests.post(f"{API_BASE}/admin/container-types", json=new_container, headers=headers)
if response.status_code == 200:
    print("✅ Container type creation successful")
    created_container_id = new_container["id"]
else:
    print(f"❌ Container type creation failed: {response.status_code}")
    created_container_id = None

# Test updating the container type
if created_container_id:
    updated_container = new_container.copy()
    updated_container["description"] = "Updated test container description"
    updated_container["price_modifier"] = 1.3
    
    response = requests.put(f"{API_BASE}/admin/container-types/{created_container_id}", 
                           json=updated_container, headers=headers)
    if response.status_code == 200:
        print("✅ Container type update successful")
    else:
        print(f"❌ Container type update failed: {response.status_code}")

# Test creating a new shipping route
new_route = {
    "id": str(uuid.uuid4()),
    "origin_port": "LED",
    "destination_port": "VVO",
    "carrier": "Test Shipping Line",
    "transit_time_days": 15,
    "base_price_usd": 950.0,
    "available_container_types": ["20ft Standard", "40ft Standard"],
    "frequency": "Weekly"
}

response = requests.post(f"{API_BASE}/admin/routes", json=new_route, headers=headers)
if response.status_code == 200:
    print("✅ Shipping route creation successful")
    created_route_id = new_route["id"]
else:
    print(f"❌ Shipping route creation failed: {response.status_code}")
    created_route_id = None

# Test search with the new route
if created_route_id:
    from datetime import date, timedelta
    
    search_data = {
        "origin_port": "LED",
        "destination_port": "VVO",
        "departure_date_from": (date.today() + timedelta(days=7)).isoformat(),
        "departure_date_to": (date.today() + timedelta(days=14)).isoformat(),
        "container_type": "20ft Standard",
        "cargo_type": "Сухие грузы",
        "containers_count": 1
    }
    
    response = requests.post(f"{API_BASE}/search", json=search_data)
    if response.status_code == 200 and len(response.json()) > 0:
        result = response.json()[0]
        if result["carrier"] == "Test Shipping Line":
            print("✅ New route appears in search results")
        else:
            print("❌ New route not found in search results")
    else:
        print("❌ Search with new route failed")

# Cleanup: Delete the test container type
if created_container_id:
    response = requests.delete(f"{API_BASE}/admin/container-types/{created_container_id}", headers=headers)
    if response.status_code == 200:
        print("✅ Container type deletion successful")
    else:
        print(f"❌ Container type deletion failed: {response.status_code}")

# Cleanup: Delete the test route
if created_route_id:
    response = requests.delete(f"{API_BASE}/admin/routes/{created_route_id}", headers=headers)
    if response.status_code == 200:
        print("✅ Shipping route deletion successful")
    else:
        print(f"❌ Shipping route deletion failed: {response.status_code}")

print("Admin CRUD testing completed.")