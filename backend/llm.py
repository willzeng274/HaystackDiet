import json
from haystack import Pipeline, PredefinedPipeline
import urllib.request

from haystack.components.builders import PromptBuilder
from haystack.components.generators import OpenAIGenerator

import pandas as pd
from pydantic import BaseModel

from validator import OutputValidator
from typing import Optional

class DietFields(BaseModel):
    gluten: Optional[str]
    lactose: Optional[str]
    vegan: Optional[str]
    vegetarian: Optional[str]
    halal: Optional[str]
    kosher: Optional[str]
    nut: Optional[str]

class DietOutput(BaseModel):
    is_single_dietary_field: bool
    single_dietary_field: Optional[str]
    dietary_fields: DietFields

def find_diet_columns(cols: pd.Index):
    """
    Feeds the columns into OpenAI and haystack and returns which ones are relevant for dietary restrictions.

    output structure:
        {
            "is_single_dietary_field": bool,
            # if it not a dietary field, then these will map to corresponding columns
            "dietary_fields": {
                "gluten": str | None,
                "lactose": str | None,
                "vegan": str | None,
                "vegetarian": str | None,
                "halal": str | None,
                "kosher": str | None,
                "nut": str | None
            }
        }
    """

    columns = cols.tolist()

    generator = OpenAIGenerator()
    output_validator = OutputValidator(pydantic_model=DietOutput)
    json_schema = DietOutput.model_json_schema()

    prompt_template = """
    Create a JSON object from the following input, which is a list of columns read from a csv file. You need to indicate whether or not the list of columns include any fields where the column records dietary restriction or food allergy:
    Indicate "is_single_dietary_field" as true if there is only one column that records dietary restrictions or food allergies. If there are multiple columns that record dietary restrictions or food allergies, indicate "is_single_dietary_field" as false.
    "single_dietary_field" should be the name of the column that records dietary restrictions or food allergies if "is_single_dietary_field" is true. If "is_single_dietary_field" is false, "single_dietary_field" should be null.
    The "dietary_fields" object should contain the following fields: "gluten", "lactose", "vegan", "vegetarian", "halal", "kosher", and "nut". Each field should contain the name of the column that records the corresponding dietary restriction or food allergy. If a column does not record a particular dietary restriction or food allergy, the field should be null.
    {{passage}}.
    Only use information that is present in the passage. Follow this JSON schema, but only return the actual instances without any additional schema definition:
    {{schema}}
    Make sure your response is a dict and not a list.
    {% if invalid_replies and error_message %}
    You already created the following output in a previous attempt: {{invalid_replies}}
    However, this doesn't comply with the format requirements from above and triggered this Python exception: {{error_message}}
    Correct the output and try again. Just return the corrected output without any extra explanations.
    {% endif %}
    """
    prompt_builder = PromptBuilder(template=prompt_template)

    pipeline = Pipeline(max_runs_per_component=5)

    pipeline.add_component(instance=prompt_builder, name="prompt_builder")
    pipeline.add_component(instance=generator, name="llm")
    pipeline.add_component(instance=output_validator, name="output_validator")

    pipeline.connect("prompt_builder", "llm")
    pipeline.connect("llm", "output_validator")
    pipeline.connect(
        "output_validator.invalid_replies", "prompt_builder.invalid_replies"
    )
    pipeline.connect("output_validator.error_message", "prompt_builder.error_message")

    result = pipeline.run(
        data={
            "prompt_builder": {
                "passage": "The following columns are present in the dataset: "
                + ", ".join(columns),
                "schema": json_schema,
            },
        }
    )

    valid_reply = result["output_validator"]["valid_replies"][0]
    valid_json = json.loads(valid_reply)

    return valid_json

if __name__ == "__main__":
    ...
    