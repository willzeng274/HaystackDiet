from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
import pandas as pd
import logging
import io
from pydantic import BaseModel
from llm import find_diet_columns
from enum import IntEnum
from googlemap import get_restaurant_menus
from typing import List, Dict
import random
import json

 
# Create a logger
logger = logging.getLogger(__name__)

# Set the logging level
logger.setLevel(logging.INFO)

# Create a file handler and a stream handler
file_handler = logging.FileHandler('app.log')
stream_handler = logging.StreamHandler()

# Create a formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
stream_handler.setFormatter(formatter)

# Add the handlers to the logger
logger.addHandler(file_handler)
logger.addHandler(stream_handler)

app = FastAPI(title="AI Food Game Backend")
client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# # Combined Enums
  
# class RestrictionType(str, Enum):
#     GLUTEN = "GLUTEN"
#     LACTOSE = "LACTOSE"
#     VEGAN = "VEGAN"
#     VEGETARIAN = "VEGETARIAN"
#     HALAL = "HALAL"
#     KOSHER = "KOSHER"
#     NUT = "NUT"

# class ConsequenceType(str, Enum):
#     REFUND = "REFUND"
#     TOILET_EXPLOSION = "TOILET_EXPLOSION"
#     ANGER = "ANGER"
#     FLATULENCE = "FLATULENCE" flatulence 
#     RELIGIOUS_OFFENSE = "RELIGIOUS_OFFENSE"
#     SEIZURE = "SEIZURE"

# class OrderStatus(str, Enum):
#     PENDING = "PENDING"
#     SERVED = "SERVED"
#     FAILED = "FAILED"


# GLUTEN 10
# LACTOSE 12
# VEGAN 5
# VEGETARIAN 3
# HALAL 2
# NUT 1
# NORMAL 100


class Restrictions(BaseModel):
    GLUTEN: int
    LACTOSE: int
    VEGAN: int
    VEGETARIAN: int
    HALAL: int
    NUT: int
    NORMAL: int

class GenerateMealResponse(BaseModel):
    restrictions: Restrictions
    days: int
    long: float
    lat: float
    
class MenuItem(BaseModel):
    name: str
    description: str
    price: float
    category: str
    restrictions: List[str]

class MealPlan(BaseModel):
    day: int
    meals: Dict[str, List[Dict[str, any]]]


from pydantic import BaseModel
from typing import List

# Define the meal item structure
class MealItem(BaseModel):
    dietary_restriction: str
    restaurant: str
    item: str
    price: float
    people_count: int
    is_special_request: bool

# Define the structure for each meal time
class MealTimeItems(BaseModel):
    breakfast: List[MealItem]
    lunch: List[MealItem]
    dinner: List[MealItem]

# Define the structure for each day's meal plan
class DayPlan(BaseModel):
    day: int
    meals: MealTimeItems

# Define the overall meal plan structure
class MealPlanResponse(BaseModel):
    meal_plans: List[DayPlan]

@app.post("/generate-meal")
async def generate_meal_schedule(response: GenerateMealResponse):
    try:
        restaurantData = get_restaurant_menus(response.long, response.lat)
        
        # Simplify restaurant data
        simplified_menu = []
        for restaurant in restaurantData:
            menu_items = []
            for item in restaurant["menu_items"]:
                menu_items.append({
                    "name": item["name"],
                    "price": item["price"],
                    "restrictions": item["restrictions"],
                    "category": item["category"]
                })
            
            simplified_menu.append({
                "name": restaurant["name"],
                "menu_items": menu_items
            })

        prompt = f"""Create a {response.days}-day meal plan with 3 meals per day.
People count per restriction:
- GLUTEN: {response.restrictions.GLUTEN}
- LACTOSE: {response.restrictions.LACTOSE}
- VEGAN: {response.restrictions.VEGAN}
- VEGETARIAN: {response.restrictions.VEGETARIAN}
- HALAL: {response.restrictions.HALAL}
- NUT: {response.restrictions.NUT}
- NO RESTRICTIONS: {response.restrictions.NORMAL}

Rules:
1. Use existing menu items or create reasonable alternatives
2. Mark created items with "(Special Request)"
3. Ensure each person gets breakfast, lunch, and dinner
4. Price ranges: Breakfast $8-15, Lunch $12-25, Dinner $15-35

Available Restaurants:
{json.dumps(simplified_menu, indent=2)}"""

        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a meal planning assistant that creates detailed meal plans based on restaurant data and dietary restrictions."},
                {"role": "user", "content": prompt}
            ],
            response_format=MealPlanResponse
        )
        print(completion.choices[0].message.parsed)
        return completion.choices[0].message.parsed

    except Exception as e:
        logger.error(f"Error generating meal plan: {str(e)}")
        fallback_plan = generate_fallback_meal_plan(response)
        return fallback_plan
    
def generate_fallback_meal_plan(response):
    """Generate a basic meal plan when the API fails"""
    meal_plans = []
    for day in range(response.days):
        meals = {
            "breakfast": [],
            "lunch": [],
            "dinner": []
        }
        
        for restriction, count in response.restrictions.dict().items():
            if count > 0:
                for meal_type in meals:
                    price = 12 if meal_type == "breakfast" else 18 if meal_type == "lunch" else 25
                    meals[meal_type].append({
                        "dietary_restriction": restriction,
                        "restaurant": "Tim Hortons",  # Safe fallback
                        "item": f"{restriction.title()} Friendly {meal_type.title()} (Special Request)",
                        "price": price,
                        "people_count": count,
                        "is_special_request": True
                    })
                    
        meal_plans.append({
            "day": day + 1,
            "meals": meals
        })
    
    return {"meal_plans": meal_plans}

@app.post("/generate-meals-csv")
async def generate_meals_csv(csv_file: UploadFile = File(...), count: int = Form(...)):
    print("FIlE", csv_file, "COUNT", count)
    if csv_file.content_type == 'text/csv':
        # Read the CSV file
        contents = await csv_file.read()
        csv_data = contents.decode("utf-8")
        df = pd.read_csv(io.StringIO(csv_data))

        # Count how many instances of each restriction type in the column with the food
        # items' restrictions
        restriction_words = ["GLUTEN", "LACTOSE", "VEGAN", "VEGETARIAN", "HALAL", "KOSHER", "NUT"]
        restriction_count = {word: 0 for word in restriction_words}

        # GLUTEN: 2 
        # LACTOSE: 0 

        # [random shit] [restriction column]
        # The restriction column can contain any of the strings "GLUTEN, LACTOSE ... " 

        # AI pipeline
        llm_response = find_diet_columns(df.columns)
        array = df.values
        # Check that the column json has the property is_single_dietary_field set to true
        #{
        # "is_single_dietary_field": false,
        # "single_dietary_field": null,
        # "dietary_fields": {
        #     "gluten": "GLUTEN",
        #     "lactose": "LACTOSE",
        #     "vegan": "VEGAN",
        #     "vegetarian": "VEGETARIAN",
        #     "halal": "HALAL",
        #     "kosher": "KOSHER",
        #     "nut": null
        # }

        # {
        # gluten: 10
        # personCount: 100 
        # nut: 12
        # }
        personCount = 0; 
        if llm_response["is_single_dietary_field"]:  
            for row in array: 
                for entry in row: 
                    if (entry.strip().upper() in restriction_words): 
                        restriction_count[entry.strip()] += 1
                    else: 
                        personCount += 1 
        else: 
            print("Several fields, we will not handle this in the demo ;)") # we arent doing this yet! 

        restriction_count["NORMAL"] = personCount
        # print out the list of restriction types and their counts
        return restriction_count
    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)