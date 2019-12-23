# Tasks

## TODO selector
in: "remainder" list + last organizer
out: updated "done" list + mail
- select organizer (on init/first run)
- select tramline (from remaining list) and put into done list
- if not init select alternate organizer and set as "last organizer"
- store lists
- send mail to organizer with tramline

## Restaurant selector (simple)
in: tramline
out: restaurant list
config: search diameter
- select all tramstations of line t
- select all restaurants in proximity of stop(t)
- send mail with restaurant list (names)

## Apply Moudi rules
in: restaurant list (including address, geolocation, e.g. grouped by tramstop), tramline
out: filtered restaurants that face tramline (are on same street)
- find street segments of tram
- select restaurants that have address that has its address on street segment

## Restaurant suggestion
- check tripadvisor
- select best restaurants
- order by whatever criteria

## Render restaurant list
- make look nice

