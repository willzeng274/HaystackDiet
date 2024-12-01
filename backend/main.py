import time
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
    KOSHER: int
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


@app.post("/generate-meal") 
async def generate_meal_schedule(response: GenerateMealResponse):
    try:
        restaurantData = get_restaurant_menus(response.long, response.lat)
        
        # Simplify restaurant data to reduce prompt size
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

        pplCountsForPrompt= ""; 
        pplGroups = 0;
        for key in response.restrictions.dict(): 
            if response.restrictions.dict()[key] > 0: 
                pplCountsForPrompt += f"- {key}: {response.restrictions.dict()[key]}\n"
                pplGroups += 1



        prompt = f"""Create a {response.days}-day meal plan with enough meals for breakfast, lunch and dinner for each day
{pplGroups} GROUPS OF PEOPLE TO ACCOMODATE:
{pplCountsForPrompt}

Rules:
1. Use existing menu items as much as possible but create reasonable alternatives if necessary (i.e. people with nut allergies cannot have an almond cookie)
2. Mark created items with "(Special Request)"
3. ENSURE EACH person group gets breakfast, satisfying {pplGroups} of people with the restriction listed in PEOPLE TO ACCOMODATE
4. ENSURE EACH person group gets lunch, satisfying {pplGroups} of people with the restriction listed in PEOPLE TO ACCOMODATE
5. ENSURE EACH person group gets dinner, satisfying {pplGroups} of people with the restriction listed in PEOPLE TO ACCOMODATE
6. Price ranges: Breakfast $8-15, Lunch $12-25, Dinner $15-35, no price can be 0$
7. For the person count simply use the number of people with the restriction listed in PEOPLE TO ACCOMODATE
8. Each group of meals should have one unique retaurant, i.e breakfast is from restaurant A, lunch is from restaurant B, dinner is from restaurant C

Here is an example for 4 people groups with the following restrictions:
- GLUTEN: 2
- LACTOSE: 2
- NUT: 3
- NORMAL: 6

This means that there should be FOUR options for each meal of the day (breakfast, lunch, dinner) that satisfy the above restrictions.

Here is a sample result for the breakfast, lunch and dinner for each day:

Example result json for the breakfast: 

"dietary_restriction": "GLUTEN",
"restaurant": "Manchu Wok",
"item": "Jasmine Green Tea",
"price": 5,
"people_count": 2,
"is_special_request": false

"dietary_restriction": "LACTOSE",
"restaurant": "Manchu Wok",
"item": "Lactose Free Lychee Lemonade",
"price": 6,
"people_count": 2,
"is_special_request": true

"dietary_restriction": "NUT",
"restaurant": "Manchu Wok",
"item": "Lychee Lemonade",
"price": 6,
"people_count": 3,
"is_special_request": false

"dietary_restriction": "NORMAL",
"restaurant": "Manchu Wok",
"item": "Regular Lychee Lemonade",
"price": 6,
"people_count": 6,
"is_special_request": false

Lunch and Dinner json follow suit. Notice how the breakfast, lunch and dinner should always include one of each type of restriction listed in PEOPLE TO ACCOMODATE

Available Restaurants For Actual Menu Items:
{json.dumps(simplified_menu, indent=2)}

Return JSON format:
{{
    "meal_plans": [
        {{
            "day": number,
            "meals": {{
                "breakfast": [
                    {{
                        "dietary_restriction": string,
                        "restaurant": string,
                        "item": string,
                        "price": number,
                        "people_count": number,
                        "is_special_request": boolean
                    }}
                ],
                "lunch": [...],
                "dinner": [...]
            }}
        }}
    ]
}}"""
        print("PROMPT", prompt)

        completion = await client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "You are a meal planning assistant that creates detailed meal plans based on restaurant data and dietary restrictions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            timeout=70.0  # Set timeout to 30 seconds
        )
        
        meal_plan = json.loads(completion.choices[0].message.content)
        return meal_plan

    except Exception as e:
        logger.error(f"Error generating meal plan: {str(e)}")
        # Generate a basic fallback meal plan
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
        df2 = pd.read_csv(io.StringIO(csv_data), header=None)

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
        array2 = df2.values

        personCount = 0; 
        if llm_response["is_single_dietary_field"] or True:  

            # find column that has the "single_dietary_field" 
            foundColumn = 0
            for row in array2: 
                count = 0; 
                for entry in row: 
                    if (llm_response["single_dietary_field"] in str(entry)):
                        foundColumn = count
                        break
                    count+=1; 
            print("FOUND COLUMN: ", foundColumn)

            for row in array: 
                print("ROW: ", str(row))
                colCount = 0;
                for entry in row:
                    # Check that the name of the column matches the llm
                    print("ROW ENTRY ", entry, "COLCOUNT", colCount)

                    if (colCount != foundColumn or entry == "nan"):
                        colCount += 1
                        continue
                    else:
                        colCount += 1
                    
                
                    print("CURRENTLY AT ENTRY:", entry)
                    if (str(entry).strip().upper() in restriction_words): 
                        restriction_count[str(entry).strip()] += 1
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