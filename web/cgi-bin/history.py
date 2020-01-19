import json

with open('/home/pi/moudi/config.json') as config_file:
    config = json.load(config_file)
    history = config['history']

    print("Content-Type: application/json")    # minimal header
    print()
    print(json.dumps(history, indent=4))