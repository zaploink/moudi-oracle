import json

with open('/home/pi/moudi/config.json') as config_file:
    config = json.load(config_file)
    history = config['history']

    if len(history) == 0:
        print('No moudi history present.')
    else:
        print(json.dumps(history, indent=4))