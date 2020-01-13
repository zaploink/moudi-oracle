var moudi = function () {

    const overpass = function () {
        const baseUrl = 'http://overpass.osm.ch/api/interpreter?data=';
        const requests = {
            tramlines :  function(onSuccess) {
                const query = `[out:json];
                  area[name="Zürich"];
                  relation[route=tram][ref](area)->.trams;
                  foreach.trams (
                    convert rel
                      ::id = u(id()),
                      name = u(t["name"]),
                      from = u(t["from"]),
                      to = u(t["to"]),
                      ref = u(t["ref"]);
                    out;
                  )`.replace(/\s+/g, ' ');

                const url = baseUrl + encodeURIComponent(query);
                console.debug(url);

                $.get(url, onSuccess);
            },
            tramroute : function(tramId, onSuccess) {
                const query = `[out:json];
                  rel(id:${tramId});
                  ._->.tram;
                  way(r.tram)[railway=tram];
                  ._->.tracks;
                  node(r.tram)[railway=tram_stop];
                  ._->.stops;
                  nwr[amenity=restaurant](around:100);
                  ._->.stopRest;
                  .tram;
                  nwr[amenity=restaurant](around:20);
                  ._->.tramRest;
                  node.tramRest.stopRest;
                  ._->.candidates;
                  (
                    .tram;
                    .stops;
                    .candidates;
                  );
                  out geom;
                `.replace(/\s+/g, ' ');

                const url = baseUrl + encodeURIComponent(query);
                console.debug(url);

                $.get(url, onSuccess);
            }
        };
        return {
            tramlines: requests.tramlines,
            tramroute: requests.tramroute,
        }
    }();

    const cache = {
        tramsByNumber : null,
        tramRelation : null,
        map : null,
        geoJsonLayer : null
    };

    function initTramLines() {
        overpass.tramlines(function(result) {
            console.debug(`Query returned ${result.elements.length} tram relations`);
            const tramsByNumber = new Map();
            for (let tram of result.elements) {
                tramsByNumber.set(tram.tags.ref, tram); // last one wins
            }
            console.debug(`Mapped to a total of ${tramsByNumber.size} tram lines`);
            console.debug(tramsByNumber);
            for (var i = 2; i <= 17; i++) { // skip 16, does not exist
                const tram = tramsByNumber.get(i.toString());
                if (tram) {
                    $('#tram-selector').append(`<option value="${i}">${tram.tags.name}</option>`);
                }
            }
            cache.tramsByNumber = tramsByNumber;
        });
    }

    // some restaurants may be contained as way/polygon rather than node in OSM result -> map to point in Leaflet
    function polygonToPoint(feature) {
        const isPolygon = (feature.geometry) && (feature.geometry.type !== undefined) && (feature.geometry.type === "Polygon");
        if (isPolygon) {
            feature.geometry.type = "Point";
            const polygonCenter = L.latLngBounds(feature.geometry.coordinates[0]).getCenter();
            feature.geometry.coordinates = [polygonCenter.lat, polygonCenter.lng];
        }
    }

    function loadRouteAndRestaurants(tramId) {
        console.debug(`Loading route and restaurants for tram #${tramId}`);
        const tram = cache.tramsByNumber.get(tramId);

        overpass.tramroute(tram.id, function (result) {
            console.debug(`Query returned ${result.elements.length} elements`);
            console.debug(result);

            // filter out all platforms and stops of relation (uninteresting or already contained in result.elements, respectively)
            const relation = result.elements.find(elem => elem.type === "relation");
            relation.members = relation.members.filter(member => member.role === "");
            cache.tramRelation = relation;

            const resultAsGeojson = osmtogeojson(result);
            console.debug(resultAsGeojson);

            const geoJsonLayer = L.geoJson(resultAsGeojson, {
                style: function (feature) {
                    if (feature.geometry.type === "LineString") {
                        return {color: "#5050d0"}; // route elements
                    }
                    if (feature.properties.tags.railway === "tram_stop") {
                        return {color: "#0000d0", opacity: 1.0, weight: 2, fill: "#a0a0d0", fillOpacity: 0.5}; // stations
                    }
                },
                pointToLayer: function (point, latlng) {
                    if (point.properties.tags.railway === "tram_stop") {
                        return L.circleMarker(latlng);
                    }
                    // TODO: should use something like https://github.com/lvoogdt/Leaflet.awesome-markers to style the markers
                    return L.marker(latlng, {
                        title: point.properties.tags.name,
                        riseOnHover: true
                    });
                },
                filter: function (feature, layer) {
                    polygonToPoint(feature);
                    return true;
                },
                onEachFeature: function (feature, layer) {
                    var popupContent = "";
                    if (feature.properties.type === "way") {
                        popupContent += `<div><b>${relation.tags.name}</b></div>`;
                    } else if (feature.properties.tags.railway === "tram_stop") {
                        popupContent += `<div><b>${feature.properties.tags.name}</b></div>`;
                    } else if (feature.properties.tags.amenity === "restaurant") {
                        popupContent += `<div>Restaurant: <b>${feature.properties.tags.name}</b></div>`;
                        var keys = Object.keys(feature.properties.tags);
                        keys.forEach(function (key) {
                            popupContent = popupContent + "<dt>" + key + "</dt><dd>" + feature.properties.tags[key] + "</dd>";
                        });
                        popupContent = popupContent + "</dl>"
                    }
                    else {
                        popupContent += feature.id;
                    }
                    layer.bindPopup(popupContent);
                }
            }).addTo(cache.map);
            cache.geoJsonLayer = geoJsonLayer;
        });

    }

    function init() {
        cache.map = L.map('map').setView([47.376981, 8.5405079], 14);
        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors</a>'
        }).addTo(cache.map);

        initTramLines();
        $("#tram-selector").change(function () {
            const tramId = $("#tram-selector option:selected").val();
            cache.geoJsonLayer && cache.geoJsonLayer.clearLayers();
            loadRouteAndRestaurants(tramId);
        });
    }

    return {
        init: init
    }
}();