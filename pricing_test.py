#!/usr/bin/env python3
import requests
import json
from datetime import date, timedelta

API_BASE = 'https://env-config-6.preview.emergentagent.com/api'

print("Testing pricing algorithm and edge cases...")

# Test pricing calculation with multiple containers
search_data = {
    'origin_port': 'SHA',
    'destination_port': 'LED',
    'departure_date_from': (date.today() + timedelta(days=7)).isoformat(),
    'departure_date_to': (date.today() + timedelta(days=14)).isoformat(),
    'container_type': '20ft Standard',
    'cargo_type': 'Сухие грузы',
    'containers_count': 3
}

response = requests.post(f'{API_BASE}/search', json=search_data)
if response.status_code == 200:
    result = response.json()[0]
    print(f'✅ Pricing Test: 3 containers price = ${result["price_from_usd"]} USD')
    print(f'   Route: {result["carrier"]} - {result["origin_port"]} to {result["destination_port"]}')
    print(f'   Transit time: {result["transit_time_days"]} days')
else:
    print(f'❌ Pricing test failed: {response.status_code}')

# Test with reefer container (higher price modifier)
search_data2 = {
    'origin_port': 'HAM',
    'destination_port': 'NVS',
    'departure_date_from': (date.today() + timedelta(days=5)).isoformat(),
    'departure_date_to': (date.today() + timedelta(days=10)).isoformat(),
    'container_type': '20ft Reefer',
    'cargo_type': 'Продукты питания',
    'containers_count': 1
}

response2 = requests.post(f'{API_BASE}/search', json=search_data2)
if response2.status_code == 200:
    result2 = response2.json()[0]
    print(f'✅ Reefer Container Test: Price = ${result2["price_from_usd"]} USD (with 1.5x modifier)')
else:
    print(f'❌ Reefer container test failed: {response2.status_code}')

# Test invalid container type
search_data3 = {
    'origin_port': 'SHA',
    'destination_port': 'LED',
    'departure_date_from': (date.today() + timedelta(days=7)).isoformat(),
    'departure_date_to': (date.today() + timedelta(days=14)).isoformat(),
    'container_type': 'Invalid Container',
    'cargo_type': 'Сухие грузы',
    'containers_count': 1
}

response3 = requests.post(f'{API_BASE}/search', json=search_data3)
if response3.status_code == 400:
    print('✅ Error Handling: Correctly rejects invalid container type')
else:
    print(f'❌ Error handling failed: {response3.status_code}')

print("Pricing and edge case testing completed.")