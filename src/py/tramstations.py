import urllib.request
import urllib.parse
import json
from datetime import date

DEBUG = False


def stopToStationString(stop, prefix="\t"):
    station = stop['station']
    return prefix + "{} ({},{}), ID={}".format(station['name'], station['coordinate']['x'], station['coordinate']['y'], station['id'])


def debug(msg):
    if (DEBUG):
        print(msg)


def main():
    """
    Loads station lists for all Zurich trams, using the transport.opendata.ch API
    Since tram lines cannot be queried directly, we have to ask for a departure at a terminal
    station (using 17:00 as time to hit major commuter traffic) and then print the
    list of passed stations on the tram's journey.
    """

    # from https://en.wikipedia.org/wiki/Trams_in_Z%C3%BCrich#Route_network
    terminals = {
        '2': ['8576182', 'Tiefenbrunnen, Bahnhof', 'Schlieren, Geissweid'],
        '3': ['8591233', 'Klusplatz', 'Albisrieden'],
        '4': ['8576182', 'Tiefenbrunnen, Bahnhof', 'Altstetten'],
        '5': ['8591245', 'Laubegg', 'Zoo'],
        '6': ['8591428', 'Werdhölzli', 'Zoo'],
        '7': ['8591065', 'Stettbach, Bahnhof', 'Wollishoferplatz'],
        '8': ['8591178', 'Hardturm', 'Klusplatz)'],
        '9': ['8591194', 'Hirzenbach', 'Triemli)'],
        '10': ['8591034', 'Albisgütli', 'Zürich Flughafen, Fracht'],
        '11': ['8591315', 'Rehalp', 'Auzelg'],
        '12': ['8573205', 'Zürich Flughafen, Bahnhof', 'Stettbach, Bahnhof'],
        '13': ['8591034', 'Albisgütli', 'Frankental'],
        '14': ['8591354', 'Seebach', 'Triemli'],
        '15': ['8503059', 'Stadelhofen', 'Bucheggplatz']
    }

    # see https://transport.opendata.ch/docs.html#stationboard for API doc
    today = date.today().isoformat()
    time = "17:00"
    urlTemplate = "http://transport.opendata.ch/v1/stationboard?station={}&limit=10&transportations=tram&datetime=" + today + "%20" + time

    for tram in terminals:
        terminalStation = terminals[tram][0]
        stationBoardUrl = urlTemplate.format(urllib.parse.quote(terminalStation))
        debug("GET {}".format(stationBoardUrl))

        req = urllib.request.Request(stationBoardUrl)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            for journey in data['stationboard']:
                if journey['number'] == tram:
                    firstStop = journey['stop']
                    passList = journey['passList']
                    print("Tram #{} ({} stops):".format(tram, len(passList) + 1))
                    print(stopToStationString(firstStop))  # first station
                    for stop in passList:
                        if stop['station']['name'] is not None: # it seems that the first entry in passList is sometimes empty
                            print(stopToStationString(stop))
                    break # handle first match only


if __name__ == "__main__":
    main()
