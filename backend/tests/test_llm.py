import pytest
import pandas as pd
from backend.llm import find_diet_columns, DietOutput, DietFields

def test_find_diet_columns_basic():
    # Test with obvious dietary columns
    columns = pd.Index(['product_name', 'is_vegan', 'is_gluten_free', 'price'])
    result = find_diet_columns(columns)
    
    assert isinstance(result, dict)
    assert 'is_single_dietary_field' in result
    assert 'dietary_fields' in result
    assert isinstance(result['dietary_fields'], dict)

def test_find_diet_columns_empty():
    # Test with non-dietary columns
    columns = pd.Index(['id', 'price', 'product_name', 'color'])
    result = find_diet_columns(columns)
    
    assert result['is_single_dietary_field'] is False
    assert all(value is None for value in result['dietary_fields'].values())

def test_find_diet_columns_all_dietary():
    # Test with multiple dietary columns
    columns = pd.Index([
        'is_vegan', 'contains_gluten', 'lactose_free',
        'halal_certified', 'kosher_certified', 'contains_nuts'
    ])
    result = find_diet_columns(columns)
    
    assert result['is_single_dietary_field'] is False
    # At least some dietary fields should be identified
    assert any(value is not None for value in result['dietary_fields'].values())

def test_find_diet_columns_single_field():
    # Test with a single dietary column containing multiple values
    columns = pd.Index(['id', 'dietary_restrictions', 'price'])
    result = find_diet_columns(columns)
    
    assert result['is_single_dietary_field'] is True

def test_find_diet_columns_output_structure():
    # Test output structure matches DietOutput model
    columns = pd.Index(['is_vegan', 'price'])
    result = find_diet_columns(columns)
    
    # Validate against Pydantic models
    diet_output = DietOutput(**result)
    assert isinstance(diet_output.dietary_fields, DietFields)

@pytest.mark.parametrize("columns,expected_fields", [
    (
        ['is_vegan', 'price'],
        {'vegan': 'is_vegan', 'gluten': None, 'lactose': None, 
         'vegetarian': None, 'halal': None, 'kosher': None, 'nut': None}
    ),
    (
        ['halal_certified', 'kosher_status'],
        {'vegan': None, 'gluten': None, 'lactose': None, 
         'vegetarian': None, 'halal': 'halal_certified', 'kosher': 'kosher_status', 'nut': None}
    ),
])
def test_find_diet_columns_specific_mappings(columns, expected_fields):
    # Test specific column mappings
    result = find_diet_columns(pd.Index(columns))
    assert result['dietary_fields'] == expected_fields

@pytest.mark.parametrize("invalid_input", [
    None,
    123,
    "not_an_index",
    ['not_an_index'],
])
def test_find_diet_columns_invalid_input(invalid_input):
    # Test error handling for invalid inputs
    with pytest.raises((TypeError, AttributeError)):
        find_diet_columns(invalid_input)

def test_find_diet_columns_case_insensitive():
    # Test case insensitivity in column recognition
    columns = pd.Index(['IS_VEGAN', 'Gluten_Free', 'HALAL'])
    result = find_diet_columns(columns)
    
    assert any(value is not None for value in result['dietary_fields'].values())
