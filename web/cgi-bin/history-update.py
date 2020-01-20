import json
import cgi, cgitb

# test with CURL:  curl localhost:8000/cgi-bin/history-update.py -X POST -F "moudiId=2020-01" -F "date=2020-01-21" -F "restaurant=Hermanseck" -F "token=2837bbG2" -F "rating=4"
cgitb.enable()

def findRecord(history, moudiId):
    return list(filter(lambda item: item['month'] == moudiId, history))[0]

def readConfig(path):
    with open(path, 'r') as config_file:
        return json.load(config_file)

def writeConfig(config, path):
    with open(path, 'w') as config_file:
        return json.dump(config, config_file, ensure_ascii=False, indent=4)

def checkAuthToken(authTokens, recordId, token):
    if recordId in authTokens:
        expectedToken = authTokens[recordId]
        if (token != expectedToken):
            raise RuntimeError("Invalid auth-token {} for history record {}".format(token, recordId))
    else:
        raise RuntimeError("No auth-token defined for history record {}".format(recordId))

def printResponse(status, statusMessage, responseText=""):
    print("Status: {} {}".format(status, statusMessage)) # this will not work with Python library HTTP server: https://stackoverflow.com/a/25801724
    print("Content-Type: text/plain")
    print()
    print(responseText)

config_path = '../../config.json'
config = readConfig(config_path)
history = config['history']
authTokens = config['auth-tokens']

form = cgi.FieldStorage()
recordId = form.getvalue('moudiId')
token = form.getvalue('token')

try:
    checkAuthToken(authTokens, recordId, token)

    record = findRecord(history, recordId)
    record['date'] = form.getvalue('date')
    record['restaurant'] = form.getvalue('restaurant')
    record['rating'] = form.getvalue('rating')

    writeConfig(config, config_path)
    printResponse(200, "OK")

except RuntimeError as error:
    printResponse(400, "Bad Request", "{}".format(error))





