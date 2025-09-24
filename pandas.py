import json
from collections import defaultdict

def apply_schema(csv_file, schema, output_file):
    """
    Applies schema mapping to the entire CSV and generates JSON.
    """
    chunksize = 50000
    results = defaultdict(list)

    for chunk in pd.read_csv(csv_file, chunksize=chunksize):
        for _, row in chunk.iterrows():
            app_name = row[schema["APPLICATION_SERVICE_NAME"]]

            # Build one service mapping for this row
            service_mapping = {}
            for key, col in schema["SERVICE_MAPPINGS"][0].items():
                if col and col in row:
                    service_mapping[key] = row[col]
                else:
                    service_mapping[key] = ""

            results[app_name].append(service_mapping)

    # Merge into final JSON
    final_output = []
    for app, mappings in results.items():
        final_output.append({
            "APPLICATION_SERVICE_NAME": app,
            "SERVICE_MAPPINGS": mappings
        })

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=2)



def run_pipeline(csv_file, output_file, llm_client):
    # 1. Extract headers + samples
    headers, samples = extract_csv_context(csv_file)

    # 2. Build LLM prompt
    prompt = build_schema_prompt(headers, samples)

    # 3. Call LLM once
    schema_response = llm_client.generate(prompt)  # <- depends on Tachyon SDK
    schema = json.loads(schema_response)           # parse JSON from LLM

    # 4. Apply schema to full CSV
    apply_schema(csv_file, schema, output_file)

# Example usage (pseudo)
# run_pipeline("bigfile.csv", "output.json", gemini_client)
