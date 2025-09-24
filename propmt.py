def build_schema_prompt(headers, samples):
    """
    Prepares the LLM prompt for schema inference.
    """
    return f"""
You are a data transformation engine. 
Your task is to infer a JSON mapping schema based on CSV headers and a few sample rows. 
Each row maps to exactly one entity type (Server, Database, Cloud, Load Balancer). 
Never populate more than one entity type in a single JSON object.

CSV Headers:
{headers}

Sample Rows:
{samples}

Output strictly in JSON. Example format:

{{
  "APPLICATION_SERVICE_NAME": "<column name>",
  "SERVICE_MAPPINGS": [
    {{
      "DB_CI_NAME": "<column or empty string>",
      "DB_CI_TYPE": "<column or empty string>",
      "SERVER_CI_NAME": "<column or empty string>",
      "SERVER_CI_TYPE": "<column or empty string>",
      "CLOUD_COMPONENT": "<column or empty string>",
      "LOAD_BALANCER": "<column or empty string>"
    }}
  ]
}}
"""
