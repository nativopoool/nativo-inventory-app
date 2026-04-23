import urllib.request
import json
import os

api_key = os.environ.get("OPENROUTER_API_KEY", "")
prompt = "hello " * 18000

models_to_test = [
    "google/gemma-3-27b-it:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.3-70b-instruct:free"
]

for model in models_to_test:
    data = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 100}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(data).encode("utf-8"), headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    try:
        response = urllib.request.urlopen(req)
        print(f"{model}: SUCCESS")
    except urllib.error.HTTPError as e:
        print(f"{model}: FAILED - {e.read().decode('utf-8')[:150]}")

