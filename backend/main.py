from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
import pandas as pd
import logging
import io

from llm import find_diet_columns

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

# CSV Handling Section 
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
        if llm_response["is_single_dietary_field"]:  
            for row in array: 
                for entry in row: 
                    if (entry.strip() in restriction_words): 
                        restriction_count[entry.strip()] += 1
        else: 
            print("Several fields, we will not handle this in the demo ;)") # we arent doing this yet! 

        # print out the list of restriction types and their counts
        return restriction_count
    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)