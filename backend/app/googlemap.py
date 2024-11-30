import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import re
from dataclasses import dataclass
import json
import time
import openai
from fake_useragent import UserAgent
import logging
from concurrent.futures import ThreadPoolExecutor
import cloudscraper
import concurrent.futures
import os
from dotenv import load_dotenv

load_dotenv()



logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MenuItem:
    name: str
    description: str = ""
    price: float = 0.0
    category: str = "Uncategorized"
    dietary_info: List[str] = None

@dataclass
class Restaurant:
    name: str
    address: str
    rating: float
    price_level: int
    website: str
    menu_items: List[MenuItem] = None

class RestaurantMenuFinder:
    def __init__(self, google_api_key: str, openai_api_key: str):
        self.google_api_key = google_api_key
        self.openai_api_key = openai_api_key
        openai.api_key = openai_api_key
        self.scraper = cloudscraper.create_scraper()
        self.session = requests.Session()
        self.user_agent = UserAgent()

    def get_place_details(self, place_id: str) -> Dict:
        """Fetch detailed information about a place using Google Places API."""
        base_url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            'place_id': place_id,
            'key': self.google_api_key,
            'fields': 'name,rating,formatted_phone_number,website,price_level,reviews,editorial_summary'
        }
        
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching place details: {e}")
            return {}

    def get_nearby_restaurants(self, latitude: float, longitude: float, radius: int = 5000) -> List[Restaurant]:
        """Fetch nearby restaurants using Google Places API."""
        base_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f"{latitude},{longitude}",
            'radius': radius,
            'type': 'restaurant',
            'key': self.google_api_key
        }
        
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            results = response.json()
            
            if results['status'] != 'OK':
                logger.error(f"API Error: {results['status']}")
                return []
            
            restaurants = []
            for place in results['results']:
                details = self.get_place_details(place['place_id'])
                if 'result' in details:
                    restaurant = Restaurant(
                        name=place.get('name', 'Unknown'),
                        address=place.get('vicinity', 'N/A'),
                        rating=float(place.get('rating', 0.0)),
                        price_level=int(place.get('price_level', 0)),
                        website=details['result'].get('website', '')
                    )
                    restaurants.append(restaurant)
            
            return restaurants
            
        except Exception as e:
            logger.error(f"Error fetching nearby restaurants: {e}")
            return []

    def get_chain_menu(self, restaurant_name: str) -> List[Dict]:
        """Get menu for known chain restaurants."""
        chain_menus = {
            "Wendy's": "https://www.wendys.com/api/menu",
            "Domino's Pizza": "https://www.dominos.com/media/menu.json",
            "Potbelly": "https://www.potbelly.com/api/menu",
        }
        
        try:
            if restaurant_name in chain_menus:
                response = self.scraper.get(chain_menus[restaurant_name])
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching chain menu for {restaurant_name}: {e}")
        return None

    def fetch_website_content(self, url: str, restaurant_name: str) -> str:
        """Fetch website content with improved handling."""
        if not url:
            return ""

        # Remove tracking parameters from URL
        clean_url = url.split('?')[0]

        headers = {
            'User-Agent': self.user_agent.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }

        try:
            # Try cloudscraper first
            response = self.scraper.get(clean_url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text

            # Fallback to regular requests
            response = self.session.get(clean_url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text

        except Exception as e:
            logger.error(f"Error fetching website {clean_url}: {e}")
        
        return ""

    def extract_menu_content(self, html_content: str, restaurant_name: str) -> str:
        """Extract menu content with improved selectors."""
        if not html_content:
            return ""
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove unwanted elements
        for element in soup.find_all(['script', 'style', 'footer', 'header', 'nav']):
            element.decompose()

        # Common menu selectors
        menu_selectors = {
            'class_': [
                'menu', 'food-menu', 'dinner-menu', 'lunch-menu',
                'item-name', 'menu-item', 'dish', 'food-item',
                'price', 'menu-price', 'item-price'
            ],
            'id': [
                'menu', 'food-menu', 'dinner-menu', 'lunch-menu',
                'main-menu', 'restaurant-menu'
            ]
        }

        menu_content = []
        
        # Look for elements with menu-related classes
        for selector in menu_selectors['class_']:
            elements = soup.find_all(class_=re.compile(selector, re.I))
            for elem in elements:
                text = elem.get_text(strip=True, separator=' ')
                if text and len(text) > 10:  # Avoid very short snippets
                    menu_content.append(text)

        # Look for elements with menu-related IDs
        for selector in menu_selectors['id']:
            elements = soup.find_all(id=re.compile(selector, re.I))
            for elem in elements:
                text = elem.get_text(strip=True, separator=' ')
                if text and len(text) > 10:
                    menu_content.append(text)

        # If no menu content found, try to find prices
        if not menu_content:
            price_pattern = r'\$\d+(?:\.\d{2})?'
            paragraphs = soup.find_all(['p', 'div'])
            for p in paragraphs:
                text = p.get_text(strip=True)
                if re.search(price_pattern, text) and len(text) > 10:
                    menu_content.append(text)

        return "\n".join(menu_content)

    def process_with_ai(self, text_content: str, restaurant_name: str) -> List[MenuItem]:
        """Process content with improved AI prompting."""
        if not text_content:
            return []

        try:
            system_prompt = """You are an expert at identifying menu items from restaurant websites. 
            Analyze the text and extract clear menu items with high confidence. 
            Return ONLY a JSON array of menu items, no other text."""

            user_prompt = f"""
            Extract menu items from this {restaurant_name} website text.
            Format as a JSON array where each item has:
            - name: Item name
            - description: Description (if available)
            - price: Number (0 if unknown)
            - category: Category name
            - dietary_info: Array of dietary notes

            Only include clear menu items. If no clear items found, return [].
            
            Text: {text_content[:4000]}
            """

            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )

            content = response.choices[0].message.content.strip()
            
            try:
                menu_data = json.loads(content)
                return [MenuItem(
                    name=item.get('name', ''),
                    description=item.get('description', ''),
                    price=float(item.get('price', 0)),
                    category=item.get('category', 'Uncategorized'),
                    dietary_info=item.get('dietary_info', [])
                ) for item in menu_data]
            except json.JSONDecodeError:
                # Try to find JSON array in response
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    menu_data = json.loads(json_match.group())
                    return [MenuItem(
                        name=item.get('name', ''),
                        description=item.get('description', ''),
                        price=float(item.get('price', 0)),
                        category=item.get('category', 'Uncategorized'),
                        dietary_info=item.get('dietary_info', [])
                    ) for item in menu_data]
            return []

        except Exception as e:
            logger.error(f"Error processing with AI for {restaurant_name}: {e}")
            return []

    def process_restaurant(self, restaurant: Restaurant) -> Restaurant:
        """Process a single restaurant with improved handling."""
        if not restaurant.website:
            return restaurant

        logger.info(f"Processing {restaurant.name}")
        
        # Try to get chain restaurant menu first
        chain_menu = self.get_chain_menu(restaurant.name)
        if chain_menu:
            # Process chain menu data
            try:
                menu_items = self.process_with_ai(json.dumps(chain_menu), restaurant.name)
                if menu_items:
                    restaurant.menu_items = menu_items
                    return restaurant
            except Exception as e:
                logger.error(f"Error processing chain menu for {restaurant.name}: {e}")

        # Regular website processing
        content = self.fetch_website_content(restaurant.website, restaurant.name)
        if content:
            menu_content = self.extract_menu_content(content, restaurant.name)
            restaurant.menu_items = self.process_with_ai(menu_content, restaurant.name)
        
        return restaurant

    def find_restaurant_menus(self, latitude: float, longitude: float, radius: int = 50000) -> List[Restaurant]:
        """Main method to find nearby restaurants and their menus."""
        try:
            # Get nearby restaurants
            restaurants = self.get_nearby_restaurants(latitude, longitude, radius)
            logger.info(f"Found {len(restaurants)} restaurants")

            # Process restaurants in parallel
            with ThreadPoolExecutor(max_workers=5) as executor:
                processed_restaurants = list(executor.map(self.process_restaurant, restaurants))

            return processed_restaurants

        except Exception as e:
            logger.error(f"Error in find_restaurant_menus: {e}")
            return []

def get_restaurant_menus(longitude: float, latitude: float) -> List[Dict]:
    
    finder = RestaurantMenuFinder(os.getenv("GOOGLE_API_KEY"), os.getenv("OPENAI_API_KEY"))
    restaurants = finder.find_restaurant_menus(latitude, longitude)
    
    return [{
            'name': r.name,
            'address': r.address,
            'rating': r.rating,
            'price_level': r.price_level,
            'website': r.website,
            'menu_items': [{
                'name': i.name,
                'description': i.description,
                'price': i.price,
                'category': i.category,
            } for i in (r.menu_items or [])]
        } for r in restaurants if r.menu_items]

def concurrent_find_restaurant_menus(longitude: float, latitude: float):
    # Generate coordinate pairs with smaller increments
    coordinate_pairs = [
        (longitude, latitude),                             # Center
        (longitude + 0.002, latitude + 0.002),            # Slightly NE
        (longitude - 0.002, latitude - 0.002),            # Slightly SW
        (longitude + 0.002, latitude - 0.002),            # Slightly SE
        (longitude - 0.002, latitude + 0.002)             # Slightly NW
    ]
    
    # Run searches concurrently
    all_results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(get_restaurant_menus, lon, lat) for lon, lat in coordinate_pairs]
        for future in concurrent.futures.as_completed(futures):
            try:
                results = future.result()
                if results:  # Only extend if we got results
                    all_results.extend(results)
                    print(f"Found {len(results)} restaurants in this batch")
            except Exception as e:
                print(f"Error in worker: {e}")

    # Deduplicate results
    seen = set()
    unique_results = []
    
    for restaurant in all_results:
        if restaurant['name'] not in seen:
            seen.add(restaurant['name'])
            unique_results.append(restaurant)
    
    return unique_results