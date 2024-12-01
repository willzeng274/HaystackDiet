import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Set
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
from enum import Enum

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DietaryRestriction(Enum):
    GLUTEN = "GLUTEN"
    LACTOSE = "LACTOSE"
    VEGAN = "VEGAN"
    VEGETARIAN = "VEGETARIAN"
    HALAL = "HALAL"
    KOSHER = "KOSHER"
    NUT = "NUT"
    NONE = "NONE"

@dataclass
class MenuItem:
    name: str
    description: str = ""
    price: float = 0.0
    category: str = "Uncategorized"
    dietary_info: List[str] = None
    restrictions: Set[DietaryRestriction] = None

    def __post_init__(self):
        if self.restrictions is None:
            self.restrictions = {DietaryRestriction.NONE}
        if self.dietary_info is None:
            self.dietary_info = []

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

    def get_nearby_restaurants(self, latitude: float, longitude: float, radius: int = 10) -> List[Restaurant]:
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
            with ThreadPoolExecutor(max_workers=10) as executor:
                future_to_place = {
                    executor.submit(self.get_place_details, place['place_id']): place 
                    for place in results['results']
                }
                
                for future in concurrent.futures.as_completed(future_to_place):
                    place = future_to_place[future]
                    try:
                        details = future.result()
                        if 'result' in details:
                            restaurant = Restaurant(
                                name=place.get('name', 'Unknown'),
                                address=place.get('vicinity', 'N/A'),
                                rating=float(place.get('rating', 0.0)),
                                price_level=int(place.get('price_level', 0)),
                                website=details['result'].get('website', '')
                            )
                            restaurants.append(restaurant)
                    except Exception as e:
                        logger.error(f"Error processing place: {e}")
            
            return restaurants
            
        except Exception as e:
            logger.error(f"Error fetching nearby restaurants: {e}")
            return []

    def fetch_website_content(self, url: str, restaurant_name: str) -> str:
        if not url:
            return ""

        clean_url = url.split('?')[0]
        headers = {
            'User-Agent': self.user_agent.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

        try:
            response = self.scraper.get(clean_url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text

            response = self.session.get(clean_url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text

        except Exception as e:
            logger.error(f"Error fetching website {clean_url}: {e}")
        
        return ""

    def extract_menu_content(self, html_content: str, restaurant_name: str) -> str:
        if not html_content:
            return ""
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        for element in soup.find_all(['script', 'style', 'footer', 'header', 'nav']):
            element.decompose()

        menu_selectors = {
            'class_': [
                'menu', 'food-menu', 'dinner-menu', 'lunch-menu',
                'item-name', 'menu-item', 'dish', 'food-item',
                'price', 'menu-price', 'item-price', 'menu-items',
                'food-list', 'menu-list', 'menu-section'
            ],
            'id': [
                'menu', 'food-menu', 'dinner-menu', 'lunch-menu',
                'main-menu', 'restaurant-menu', 'menu-items',
                'food-menu-list'
            ]
        }

        menu_content = []
        
        for selector in menu_selectors['class_']:
            elements = soup.find_all(class_=re.compile(selector, re.I))
            for elem in elements:
                text = elem.get_text(strip=True, separator=' ')
                if text and len(text) > 10:
                    menu_content.append(text)

        for selector in menu_selectors['id']:
            elements = soup.find_all(id=re.compile(selector, re.I))
            for elem in elements:
                text = elem.get_text(strip=True, separator=' ')
                if text and len(text) > 10:
                    menu_content.append(text)

        if not menu_content:
            price_pattern = r'\$\d+(?:\.\d{2})?'
            paragraphs = soup.find_all(['p', 'div'])
            for p in paragraphs:
                text = p.get_text(strip=True)
                if re.search(price_pattern, text) and len(text) > 10:
                    menu_content.append(text)

        return "\n".join(menu_content)

    def analyze_dietary_restrictions(self, item_name: str, description: str, dietary_info: List[str]) -> Set[DietaryRestriction]:
        try:
            system_prompt = """You are an expert at identifying dietary restrictions in food items.
            For each menu item, carefully analyze ingredients and preparation methods to determine ALL applicable dietary restrictions.
            Consider:
            - GLUTEN: Items that are gluten-free
            - LACTOSE: Items that are dairy-free
            - VEGAN: No animal products
            - VEGETARIAN: No meat products
            - HALAL: Follows Islamic dietary laws
            - KOSHER: Follows Jewish dietary laws
            - NUT: Contains nuts or nut products
            - NONE: No special dietary considerations
            
            Return ONLY a JSON array of applicable restrictions."""

            user_prompt = f"""
            Analyze this menu item and return ALL applicable dietary restrictions:
            Name: {item_name}
            Description: {description}
            Dietary Info: {', '.join(dietary_info) if dietary_info else 'None'}
            
            Consider all ingredients and preparation methods carefully.
            If multiple restrictions apply (e.g. an item is both vegan and gluten-free), include all of them.
            Only return ["NONE"] if no restrictions apply.
            
            Return ONLY a JSON array, for example:
            ["VEGAN", "GLUTEN"] or ["VEGETARIAN", "NUT"] or ["NONE"]"""

            response = openai.chat.completions.create(
                model="gpt-4o",  # Fixed model name from "gpt-4o"
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=100
            )

            content = response.choices[0].message.content.strip()
            # Clean the response to ensure valid JSON
            content = content.replace('```json', '').replace('```', '').strip()
            if not content.startswith('['):
                match = re.search(r'\[.*\]', content, re.DOTALL)
                if match:
                    content = match.group()
            
            restrictions = json.loads(content)
            return {DietaryRestriction(r) for r in restrictions}

        except Exception as e:
            logger.error(f"Error analyzing dietary restrictions: {e}")
            return {DietaryRestriction.NONE}

    def process_menu_items_with_restrictions(self, items: List[dict]) -> List[MenuItem]:
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for item in items:
                future = executor.submit(
                    self.analyze_dietary_restrictions,
                    item.get('name', ''),
                    item.get('description', ''),
                    item.get('dietary_info', [])
                )
                futures.append((item, future))
            
            menu_items = []
            for item, future in futures:
                try:
                    restrictions = future.result()
                    menu_items.append(MenuItem(
                        name=item.get('name', ''),
                        description=item.get('description', ''),
                        price=float(item.get('price', 0)),
                        category=item.get('category', 'Uncategorized'),
                        dietary_info=item.get('dietary_info', []),
                        restrictions=restrictions
                    ))
                except Exception as e:
                    logger.error(f"Error processing menu item: {e}")
            
            return menu_items

    def generate_menu_with_ai(self, restaurant_name: str, price_level: int) -> List[MenuItem]:
        """Generate menu items using AI with comprehensive dietary restriction handling."""
        try:
            system_prompt = """You are a menu generation expert. Generate a realistic menu with diverse dietary options.
            Include items that meet various dietary restrictions:
            - GLUTEN: Gluten-free options
            - LACTOSE: Dairy-free options
            - VEGAN: No animal products
            - VEGETARIAN: No meat products
            - HALAL: Follows Islamic dietary laws
            - KOSHER: Follows Jewish dietary laws
            - NUT: Contains nuts (mark for allergy awareness)
            - NONE: No special dietary considerations
            
            IMPORTANT: Response must be ONLY a JSON array with detailed menu items."""

            price_range = "low-cost" if price_level <= 1 else "mid-range" if price_level == 2 else "high-end"
            base_price = {
                "appetizer": {"low-cost": 8, "mid-range": 12, "high-end": 18},
                "main": {"low-cost": 15, "mid-range": 25, "high-end": 40},
                "dessert": {"low-cost": 6, "mid-range": 10, "high-end": 15},
                "drink": {"low-cost": 4, "mid-range": 8, "high-end": 12}
            }
            
            user_prompt = f"""Create a diverse menu for '{restaurant_name}' ({price_range}).
            Include items for different dietary needs and preferences.
            Return a JSON array where each item has:
            {{
                "name": "item name",
                "description": "detailed description with specific ingredients",
                "price": number,
                "category": "category name",
                "dietary_info": ["DIETARY_RESTRICTION1", "DIETARY_RESTRICTION2", etc]
            }}
            
            Guidelines:
            1. Include 8-10 items across different categories
            2. Price ranges for {price_range}:
            - Appetizers: ${base_price['appetizer'][price_range]}-${base_price['appetizer'][price_range]+4}
            - Mains: ${base_price['main'][price_range]}-${base_price['main'][price_range]+15}
            - Desserts: ${base_price['dessert'][price_range]}-${base_price['dessert'][price_range]+4}
            - Drinks: ${base_price['drink'][price_range]}-${base_price['drink'][price_range]+4}
            3. Include:
            - At least 2 vegetarian options
            - At least 1 vegan option
            - At least 1 gluten-free option
            - Clear ingredient listings for allergen identification
            
            RESPOND WITH ONLY THE JSON ARRAY, NO OTHER TEXT."""

            max_retries = 3
            for attempt in range(max_retries):
                try:
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
                    
                    # Clean the response
                    content = content.replace('```json', '').replace('```', '').strip()
                    if not content.startswith('['):
                        match = re.search(r'\[.*\]', content, re.DOTALL)
                        if match:
                            content = match.group()
                    
                    try:
                        menu_data = json.loads(content)
                        if isinstance(menu_data, list) and len(menu_data) > 0:
                            menu_items = []
                            for item in menu_data:
                                # Process dietary restrictions for each item
                                restrictions = self.analyze_dietary_restrictions(
                                    item.get('name', ''),
                                    item.get('description', ''),
                                    item.get('dietary_info', [])
                                )
                                
                                menu_items.append(MenuItem(
                                    name=item.get('name', ''),
                                    description=item.get('description', ''),
                                    price=float(item.get('price', 0)),
                                    category=item.get('category', 'Uncategorized'),
                                    dietary_info=item.get('dietary_info', []),
                                    restrictions=restrictions
                                ))
                            return menu_items

                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error on attempt {attempt + 1}: {e}")
                        if attempt == max_retries - 1:
                            break
                
                except Exception as e:
                    logger.error(f"OpenAI API error on attempt {attempt + 1}: {e}")
                    if attempt == max_retries - 1:
                        break
                
                time.sleep(1)  # Brief pause between retries

            # Fallback menu if all attempts fail
            logger.warning(f"Falling back to default menu for {restaurant_name}")
            fallback_items = [
                MenuItem(
                    name=f"{restaurant_name} House Special",
                    description="Our signature dish prepared with fresh ingredients. Please ask server for dietary information.",
                    price=base_price['main'][price_range],
                    category="House Specials",
                    dietary_info=["Please ask server for details"],
                    restrictions={DietaryRestriction.NONE}
                ),
                MenuItem(
                    name="Vegetarian Garden Plate",
                    description="Fresh seasonal vegetables with house-made sauce. Vegetarian friendly.",
                    price=base_price['main'][price_range] - 5,
                    category="Mains",
                    dietary_info=["VEGETARIAN"],
                    restrictions={DietaryRestriction.VEGETARIAN}
                )
            ]
            return fallback_items

        except Exception as e:
            logger.error(f"Critical error in menu generation for {restaurant_name}: {e}")
            return [MenuItem(
                name="Daily Special",
                description="Please ask server for today's special and dietary information.",
                price=base_price['main'][price_range],
                category="Specials",
                dietary_info=["Please ask server for details"],
                restrictions={DietaryRestriction.NONE}
            )]
    def process_with_ai(self, text_content: str, restaurant_name: str) -> List[MenuItem]:
        if not text_content:
            return []

        try:
            system_prompt = """You are an expert at identifying menu items from restaurant websites. 
            Extract clear menu items with detailed information."""

            user_prompt = f"""
            Extract menu items from this {restaurant_name} website text.
            Format as a JSON array with:
            - name: Item name
            - description: Description
            - price: Number (0 if unknown)
            - category: Category name
            - dietary_info: Array of dietary notes

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
            except json.JSONDecodeError:
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    menu_data = json.loads(json_match.group())
                else:
                    return []

            return self.process_menu_items_with_restrictions(menu_data)

        except Exception as e:
            logger.error(f"Error processing with AI: {e}")
            return []

    def process_restaurant(self, restaurant: Restaurant) -> Restaurant:
        if not restaurant.website:
            logger.info(f"No website for {restaurant.name}, generating menu")
            restaurant.menu_items = self.generate_menu_with_ai(restaurant.name, restaurant.price_level)
            return restaurant

        logger.info(f"Processing {restaurant.name}")
        
        content = self.fetch_website_content(restaurant.website, restaurant.name)
        if content:
            menu_content = self.extract_menu_content(content, restaurant.name)
            found_menu_items = self.process_with_ai(menu_content, restaurant.name)
            if found_menu_items:
                restaurant.menu_items = found_menu_items
            else:
                logger.info(f"No menu found on website for {restaurant.name}, generating menu")
                restaurant.menu_items = self.generate_menu_with_ai(restaurant.name, restaurant.price_level)
        else:
            logger.info(f"Could not fetch website for {restaurant.name}, generating menu")
            restaurant.menu_items = self.generate_menu_with_ai(restaurant.name, restaurant.price_level)
        
        return restaurant

    def find_restaurant_menus(self, latitude: float, longitude: float, radius: int = 100) -> List[Restaurant]:
        try:
            restaurants = self.get_nearby_restaurants(latitude, longitude, radius)
            logger.info(f"Found {len(restaurants)} restaurants")

            with ThreadPoolExecutor(max_workers=10) as executor:
                processed_restaurants = list(executor.map(self.process_restaurant, restaurants))

            return processed_restaurants

        except Exception as e:
            logger.error(f"Error in find_restaurant_menus: {e}")
            return []
    
def get_restaurant_menus(longitude: float, latitude: float) -> List[Dict]:
    finder = RestaurantMenuFinder(os.getenv("GOOGLE_API_KEY"), os.getenv("OPENAI_API_KEY"))
    restaurants = finder.find_restaurant_menus(latitude, longitude)
    
    with open('restaurant_menus.json', 'w') as f:
        json.dump( [{
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
            'restrictions': [r.name for r in i.restrictions] if i.restrictions else ["NONE"]
        } for i in (r.menu_items or [])]
    } for r in restaurants], f, indent=2)
    
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
            'restrictions': [r.name for r in i.restrictions] if i.restrictions else ["NONE"]
        } for i in (r.menu_items or [])]
    } for r in restaurants]

def concurrent_find_restaurant_menus(longitude: float, latitude: float):
    # Generate variations for wider coverage
    variations = [
        (0, 0), 
        (0.002, 0.002), (-0.002, -0.002),
        (0.002, -0.002), (-0.002, 0.002), 
        (0.004, 0), (-0.004, 0),
        (0, 0.004), (0, -0.004),
        (0.004, 0.004), (-0.004, -0.004)  # Added diagonal variations
    ]
    
    coordinates = [(longitude + dx, latitude + dy) for dx, dy in variations]
    
    # Process all coordinate pairs concurrently
    all_results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(get_restaurant_menus, lon, lat) for lon, lat in coordinates]
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(futures):
            try:
                results = future.result()
                if results:
                    all_results.extend(results)
                    print(f"Found {len(results)} restaurants in this batch")
            except Exception as e:
                print(f"Error in worker: {e}")

    # Deduplicate results based on name and address
    seen = set()
    unique_results = []
    
    for restaurant in all_results:
        key = (restaurant['name'], restaurant['address'])
        if key not in seen:
            seen.add(key)
            unique_results.append(restaurant)
    
    # Save results to file
    with open('restaurant_menus.json', 'w') as f:
        json.dump(unique_results, f, indent=2)
    
    return unique_results


def main():
    # Example coordinates (London, Ontario)
    longitude = -81.27424493999999
    latitude = 43.00749799444443
    
    print(f"Searching for restaurants around coordinates: {latitude}, {longitude}")
    results = get_restaurant_menus(longitude, latitude)
    print(f"Found {len(results)} unique restaurants")
    
    # Print summary of found restaurants
    for restaurant in results:
        menu_count = len(restaurant.get('menu_items', []))
        print(f"\n{restaurant['name']}:")
        print(f"  Address: {restaurant['address']}")
        print(f"  Rating: {restaurant['rating']}")
        print(f"  Menu Items: {menu_count}")
        
        # Print dietary restrictions summary
        restrictions = {}
        for item in restaurant.get('menu_items', []):
            for restriction in item.get('restrictions', ['NONE']):
                restrictions[restriction] = restrictions.get(restriction, 0) + 1
        if restrictions:
            print("  Dietary Options Available:")
            for restriction, count in restrictions.items():
                print(f"    - {restriction}: {count} items")

if __name__ == "__main__":
    main()