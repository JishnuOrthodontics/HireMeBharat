import json
with open('runs.json') as f:
    data = json.load(f)
    run = data.get('workflow_runs', [{}])[0]
    print(f"Status: {run.get('status')}")
    print(f"Conclusion: {run.get('conclusion')}")
    print(f"URL: {run.get('html_url')}")
