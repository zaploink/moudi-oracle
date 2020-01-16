# Tasks

## Determine next Moudi organizer and tramline and send mail
- select organizer (on init/first run) from organizer list, compare with last history
- select tramline (from tramline list), filtered by history
- if not init select alternate organizer and set as "last organizer"
- store lists/state
- send mail to organizer with tramline

Done.

## Select restaurant candidates according to Moudi rules
- select all tramstations of line t
- select all restaurants in 100m proximity of stop(t)
- ~~select restaurants that have address that has its address on street segment~~ 
replaced by further filtering the previously selected restaurants by max 
distance of 20m (30m) from tram line

Done.

## Suggest restaurants to organizer

- send mail with restaurant list (names)
- check tripadvisor
- select best restaurants
- order by whatever criteria

## Render restaurant list

- make look nice
