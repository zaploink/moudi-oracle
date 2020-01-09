# Open Street Map: Overpass API

_OpenStreetMap_ is a free alternative to Google Maps and place APIs.
The _Overpass API_ allows to perform semantic searches over all 
data that is saved in OpenStreetMap, independent of plotting.

Relevant links:
- [Manual](https://dev.overpass-api.de/overpass-doc/en/index.html)
- [Sequential Queries](https://dev.overpass-api.de/overpass-doc/en/preface/design.html)
- [Test and play](https://overpass-turbo.eu/)
- [Spacial data selection](https://dev.overpass-api.de/overpass-doc/en/full_data/index.html)

Takeaways for query language:
- `nwr[key=value]` query to select _nodes_, _ways_ and _relations_ with the given tag
- use _filters_: `[key=value]` is a _tag filter_, `(spatial condition)` is a _spatial filter_
- use _block statements_: `(<stmt>;<stmt;)` for _union_, _difference_, etc.
- _out ids;_ returns ids of objects only (_skel_ for geodata, _geom_ for gemetric shapes)
- `[out:json]` defines JSON output, or CSV: `[out:csv(::id,::type,<tagname>,<tagname>,...)]`
- `>;` finds all members of the already selected ways and relations
- `<;` finds all relations/ways that contain/refer to the already selected elements
- See [Language Overview](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Language_overview) for how 
  sequential processing and input/output to sets works
- See [Language Guide](https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide) for eaxamples
- For _coloring_ check [Map CSS](https://wiki.openstreetmap.org/wiki/Overpass_turbo/MapCSS)

Trams are modeled as relations:
- e.g. [Tram 2](https://www.openstreetmap.org/relation/2807095)
- each direction, e.g. [Tiefenbrunnen-Schlieren](https://www.openstreetmap.org/relation/2807094), is modeled as relation again

## Moudi Query

The following script calculates all restaurants that are within 100m of a tram #9 stop
and directly at the tramline, i.e. less than 20m from the tracks.

The following results are output:
- restaurants (red)
- tram stops (blue)
- tramline (purple)

```
[out:json];
area[name="Zürich"];

relation[route=tram][ref=9](area); // select tram #9
._->.tram;

node(r)[railway=tram_stop]; // select nodes of relation that are stops
._->.stops;

nwr[amenity=restaurant](around:100); // select all restaurants within 100m of selected stops
._->.stopRest;

.tram;
nwr[amenity=restaurant](around:20); // select all restaurants within 20m of tramline (alongside)
._->.tramRest;

node.tramRest.stopRest; // intersect restaurant sets (<100 to stop && <20m to tracks)
._->.candidates;

(
  .tram;
  .stops;
  .candidates;
);

out geom;

{{style:
node[railway=tram_stop]
{ color:blue; fill-color: blue;}

node[amenity=restaurant]
{ color:red; fill-color:red; }

relation[route=tram]
{ color:gray; fill-color: gray;}
}}
```

## API calls and map rendering

There is a list of public [server instances](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances).
- There is a dedicated _swiss instance_ http://overpass.osm.ch/api/interpreter. 
- To _test_ like the above use the _overpass turbo_ application under https://overpass-turbo.osm.ch/

GET http://overpass.osm.ch/api/interpreter?data=<urlencoded(query)>

POST form with `data=<query>` as `x-www-form-urlencoded` and post to http://overpass.osm.ch/api/interpreter 

### Output format

Should be set inside query, e.g. `[out:json]` for JSON.

### Render to map with Leaflet

Minimal Overpass Leaflet Example: http://bl.ocks.org/tyrasd/45e4a6a44c734497e82ccaae16a9c9ea