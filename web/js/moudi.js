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
            tramroute : function(tramId, distance, onSuccess) {
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
                  nwr[amenity=restaurant](around:${distance});
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
        geoJsonLayer : null,
        catIcon : null,
        history : null
    };

    const tramColors = [
        /*0*/ null, null, "#E10917", "#048930", "#11296F",
        /*5*/ "#734522", "#CA7D3B", "#000000", "#8AB51F", "#521882",
        /*10*/ "#E12372", "#048930", "#5EB3DB", "#FFC102", "#018DC5",
        /*15*/ "#D8242A", null, "#8D224D"
    ];

    function readVersion() {
        $.get('version.txt')
            .done(result => {
                cache.version = result;
                $("#version").text(cache.version);
            })
            .fail(error => {
                $("#version").text("Unknown version.");
            });
    }

    function readHistory() {
        const $historySelector = $('#history-selector');
        $historySelector.empty();

        $.get("/cgi-bin/history.py")
            .done(history => {
                cache.history = history;
                history.forEach(item => {
                    // const state = item.rating ? '\u2b50'.repeat(item.rating) : '\u23f3';
                    const state = item.rating ? `\u2b50=${item.rating}` : '\u23f3';
                    $historySelector.append(`<option value="${item.tramline}">${item.month} : Tram #${item.tramline} by ${item.organizer} (${state})</option>`);
                });
            })
            .fail(error => {
                $historySelector.append(`<option>No moudi history present.</option>`);
            });
    }

    function initTramLines(history) {
        overpass.tramlines(function(result) {
            console.debug(`Query returned ${result.elements.length} tram relations`);
            const tramsByNumber = new Map();
            for (let tram of result.elements) {
                tramsByNumber.set(tram.tags.ref, tram); // last one wins
            }
            console.debug(`Mapped to a total of ${tramsByNumber.size} tram lines`);
            console.debug(tramsByNumber);

            const $tramSelector = $('#tram-selector');
            $tramSelector.empty();
            $tramSelector.append(`<option value="-1">Select one of ${tramsByNumber.size} tramlines.</option>`);
            for (var i = 2; i <= 17; i++) { // skip 16, does not exist
                const tram = tramsByNumber.get(i.toString());
                if (tram) {
                    $tramSelector.append(`<option value="${i}" style="color:${tramColors[i]}">${tram.tags.name}</option>`);
                }
            }
            cache.tramsByNumber = tramsByNumber;
        });
    }

    function initUpdateDialog() {
        const which = $( "#which" ), where = $( "#where" ), when = $( "#when" ), what = $( "#what"), token = $( "#token" );
        const allFields = $( [] ).add( where ).add( when ).add( what ).add( token );

        const dialog = $( "#history-update-form" ).dialog({
            title: "Update Moudi record",
            autoOpen: false,
            height: 500,
            width: 350,
            modal: true,
            buttons: {
                "Update Moudi": function() {
                    let valid = true;
                    allFields.removeClass( "ui-state-error" );
                    allFields.each(function() {
                        valid = $(this).val().trim().length > 0;
                        if (!valid) $(this).addClass( "ui-state-error");
                    });
                    if (valid) {
                        updateMoudi({
                            moudiId : which.val().split(/\s+/)[0],
                            date: when.val(),
                            restaurant: where.val(),
                            rating: what.val(),
                            token: token.val()
                        });
                        dialog.dialog( "close" );
                    }
                },
                Cancel: function() {
                    dialog.dialog( "close" );
                }
            },
            close: function() {
                allFields.removeClass( "ui-state-error" );
                dialog.find("form")[0].reset();
            }
        });

        $( "#history-update-btn" ).button().on( "click", function() {
            const selected = $("#history-selector option:selected").text();
            const historyId = selected.split(/\s+/)[0];
            const title = selected.split(/\(/)[0];
            const record = cache.history.find(e => e.month === historyId);

            which.val(title);
            when.val(record.date || '');
            where.val(record.restaurant || '');
            what.val(record.rating || '');

            dialog.dialog( "open" );
        });

        when.datepicker();
        when.datepicker( "option", "dateFormat", "yy-mm-dd" );
    }

    function showMessageDialog(title, message) {
        const content = $( "#dialog-message p");
        content.text(message);

        const dialog = $( "#dialog-message" );
        dialog.dialog({
            title: title,
            modal: true,
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
        dialog.dialog( "open");
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

    function getDetails(tags) {
        var str = "";
        str += tags['addr:housenumber'] ? `<div>${tags['addr:street']} ${tags['addr:housenumber']}</div>` : '';
        str += tags['addr:city'] ? `<div>${tags['addr:postcode']} ${tags['addr:city']}</div>` : '';
        str += tags['website'] ? `<a href="${tags['website']}" target="_blank">${tags['website']}</a>` : '';
        str += tags['phone'] ? `<div>${tags['phone']}</div>` : '';
        str += tags['opening_hours'] ? `<div>${tags['opening_hours']}</div>` : '';
        return str;
    }

    function loadSelectedRouteAndRestaurants() {
        cache.geoJsonLayer && cache.geoJsonLayer.clearLayers();

        const tramId = $("#tram-selector option:selected").val();
        if (tramId < 0) return;
        const distance = $("#distance-selector option:selected").val();

        updateStatus(`Searching for restaurants on route #${tramId}...`);
        const tram = cache.tramsByNumber.get(tramId);

        console.debug(`Loading route and restaurants for tram #${tramId} with distance ${distance}`);
        overpass.tramroute(tram.id, distance, function (result) {
            console.debug(`Query returned ${result.elements.length} elements`);
            console.debug(result);

            // filter out all platforms and stops of relation (uninteresting or already contained in result.elements, respectively)
            const relation = result.elements.find(elem => elem.type === "relation");
            relation.members = relation.members.filter(member => member.role === "");
            cache.tramRelation = relation;

            const restaurantCount = result.elements.filter(elem => elem.tags.amenity === "restaurant").length;
            updateStatus(`Found ${restaurantCount} moudi candidates within ${distance}m of tram line #${tramId}.`);

            const resultAsGeojson = osmtogeojson(result);
            console.debug(resultAsGeojson);

            const geoJsonLayer = L.geoJson(resultAsGeojson, {
                style: function (feature) {
                    const tramColor = tramColors[tramId];
                    if (feature.properties.type === "way") {
                        return {color: tramColor }; // route elements
                    }
                    if (feature.properties.tags.railway === "tram_stop") {
                        return {color: tramColor, opacity: 1.0, weight: 2, fill: tramColor, fillOpacity: 0.4}; // stations
                    }
                },
                pointToLayer: function (point, latlng) {
                    if (point.properties.tags.railway === "tram_stop") {
                        return L.circleMarker(latlng);
                    }
                    return L.marker(latlng, {
                        title: point.properties.tags.name, // tool-tip on hover
                        icon: cache.catIcon
                    });
                },
                filter: function (feature, layer) {
                    polygonToPoint(feature);
                    return true;
                },
                onEachFeature: function (feature, layer) {
                    const tags = feature.properties.tags;
                    var popupContent = "";
                    if (feature.properties.type === "way") {
                        popupContent += `<div class="tram-route">${relation.tags.name}</div>`;
                    } else if (feature.properties.tags.railway === "tram_stop") {
                        popupContent += `<div class="tram-stop">${tags.name}</div>`;
                    } else if (feature.properties.tags.amenity === "restaurant") {
                        popupContent += `<div class="restaurant-title">${tags.name}</div>`;
                        popupContent += getDetails(tags);
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

    function updateStatus(resultString) {
        $("#query-result").text(resultString);
    }

    function updateMoudi(values) {
        $.post("/cgi-bin/history-update.py", values) // sends values as form
            .done(result => {
                if (result && result.trim().length > 0) {
                    // if something comes back, it's likely to be an error
                    // some CGI-script handlers (python library HTTP server, for example) send back 200 always even if script sets the "Status: 400" header
                    console.log(result);
                    showMessageDialog("Something didn't work out", result);
                } else {
                    readHistory();
                }
            })
            .fail(error => {
                console.log(error);
                showMessageDialog("Something didn't work out", error.responseText);
            });
    }


    function init() {
        cache.map = L.map('map').setView([47.376981, 8.5405079], 14);
        cache.catIcon = L.icon({
            iconUrl: 'icons/pusheen.png',
            iconSize: [63, 54],
        });
        cache.version = readVersion();

        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors</a>'
        }).addTo(cache.map);
        L.control.scale({ position: 'bottomright' }).addTo(cache.map);

        const history = readHistory();
        initTramLines(history);
        initUpdateDialog();

        $("#tram-selector").change(loadSelectedRouteAndRestaurants);
        $("#distance-selector").change(loadSelectedRouteAndRestaurants);

        // fixes non-reacting selection controls on mobile
        $("#overpass-api-controls div").each(function() { L.DomEvent.disableClickPropagation(this) });
    }

    return {
        init: init
    }
}();