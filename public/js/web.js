/*
$( document ).ajaxStart(function() {
    console.log('s')
    $( "#wait" ).show();
});
$( document ).ajaxStop(function() {
    console.log('p')
    $( "#wait" ).hide();
});
*/

/*
$(document).ajaxStart(function(){
    $("#wait").css("display", "block");
});

$(document).ajaxComplete(function(){
    $("#wait").css("display", "none");
});
*/

var markers = [];

mapboxgl.accessToken = 'pk.eyJ1Ijoia25hcGlrbSIsImEiOiJjajhpcXA4dmgxNGRhMzNvMTA4NnM1b2tqIn0.DTaqGYHGI_dN223R0fanvQ';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/knapikm/cjor4zq851f6f2sk7azc0e92d', // stylesheet location
    center: [-77.019, 38.903], // starting position [lng, lat]
    zoom: 11.5 // starting zoom
});

map.on('load', function() {
    // Add a new source from our GeoJSON data and set the
    // 'cluster' option to true. GL-JS will add the point_count property to your source data.
});


function w3_open() {
    document.getElementById("mySidebar").style.display = "block";
}
function w3_close() {
    markers.forEach(function(m) {
        m.remove()
    })
    if (map.getLayer('metro_lines')) {
        map.removeLayer('metro_lines');
    }
    if (map.getSource('lines')) {
        map.removeSource('lines');
    }
    if (map.getLayer('unclustered-point')) {
        map.removeLayer('unclustered-point');
    }
    if (map.getLayer('cluster-count')) {
        map.removeLayer('cluster-count');
    }
    if (map.getLayer('crime_clusters')) {
        map.removeLayer('crime_clusters');
    }
    if (map.getSource('crimesData')) {
        map.removeSource('crimesData');
    }
    //if (metro_lines) { map.removeLayer('metro_lines') }
    document.getElementById("mySidebar").style.display = "none";
}

function getAllMetro() {
    getMetroLines();
    getAllMetroStations();
}

function getMetroLines() {

    $.ajax({
      type: "GET",
      url: "/metro_lines",
      dataType: 'text',
      success: function(result) {
            data = result.split(';');
            for (i = 0; i < data.length-1; i++)
                data[i] = JSON.parse(data[i])

            map.addSource('lines', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': data,
                }
            });
            map.addLayer({
                'id': 'metro_lines',
                'type': 'line',
                'source': 'lines',
                'paint': {
                    'line-width': 3.5,
                    'line-color': ['get', 'color']
                }
            })

       },
    });
}

function getAllMetroStations() {
    
    $.ajax({
      type: "GET",
      url: "/metro_stations",
      dataType: 'text',
      success: function(result) {
            data = result.split(';');
            for (i = 0; i < data.length-1; i++)
                data[i] = JSON.parse(data[i])
            data.pop()
            var geojson = {
                type: 'FeatureCollection',
                features: data,
            }

            // add markers to map
            geojson.features.forEach(function(marker) {
              // create a HTML element for each feature
              var el = document.createElement('div');
              el.className = 'marker';
              //el.style.backgroundImage = 'url()';

              // make a marker for each feature and add to the map
              var m = new mapboxgl.Marker(el)
              .setLngLat(marker.geometry.coordinates)
              .addTo(map);
              markers.push(m)
            });

       },
    });
}

function getAllCrimesHeatMap() {
    var e = document.getElementById("crimeTypeSelect");
    var strUser = e.options[e.selectedIndex].value;

    $.ajax({
      type: "POST",
      url: "/crimes",
      data: {"crime_type": strUser},
      dataType: 'text',
      success: function(result) {
            dataCrimes = result.split(';');
            for (i = 0; i < dataCrimes.length-1; i++)
                dataCrimes[i] = JSON.parse(dataCrimes[i])

            map.addSource('trees', {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": dataCrimes
                }
            });

            map.addLayer({
              id: 'trees-heat',
              type: 'heatmap',
              source: 'trees',
              maxzoom: 15,
              paint: {
                // increase weight as diameter breast height increases
                'heatmap-weight': {
                  property: 'dbh',
                  type: 'exponential',
                  stops: [
                    [1, 0],
                    [62, 1]
                  ]
                },
                // increase intensity as zoom level increases
                'heatmap-intensity': {
                  stops: [
                    [11, 1],
                    [15, 3]
                  ]
                },
                // assign color values be applied to points depending on their density
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(236,222,239,0)',
                  0.2, 'rgb(208,209,230)',
                  0.4, 'rgb(166,189,219)',
                  0.6, 'rgb(103,169,207)',
                  0.8, 'rgb(28,144,153)'
                ],
                // increase radius as zoom increases
                'heatmap-radius': {
                  stops: [
                    [11, 15],
                    [15, 20]
                  ]
                },
                // decrease opacity to transition into the circle layer
                'heatmap-opacity': {
                  default: 1,
                  stops: [
                    [14, 1],
                    [15, 0]
                  ]
                },
              }
            }, 'waterway-label');


            map.addLayer({
              id: 'trees-point',
              type: 'circle',
              source: 'trees',
              minzoom: 14,
              paint: {
                // increase the radius of the circle as the zoom level and dbh value increases
                'circle-radius': {
                  property: 'dbh',
                  type: 'exponential',
                  stops: [
                    [{ zoom: 15, value: 1 }, 5],
                    [{ zoom: 15, value: 62 }, 10],
                    [{ zoom: 22, value: 1 }, 20],
                    [{ zoom: 22, value: 62 }, 50],
                  ]
                },
                'circle-color': {
                  property: 'dbh',
                  type: 'exponential',
                  stops: [
                    [0, 'rgba(236,222,239,0)'],
                    [10, 'rgb(236,222,239)'],
                    [20, 'rgb(208,209,230)'],
                    [30, 'rgb(166,189,219)'],
                    [40, 'rgb(103,169,207)'],
                    [50, 'rgb(28,144,153)'],
                    [60, 'rgb(1,108,89)']
                  ]
                },
                'circle-stroke-color': 'white',
                'circle-stroke-width': 1,
                'circle-opacity': {
                  stops: [
                    [14, 0],
                    [15, 1]
                  ]
                }
              }
            }, 'waterway-label');

            map.on('click', 'trees-point', function(e) {
              new mapboxgl.Popup()
                .setLngLat(e.features[0].geometry.coordinates)
                .setHTML('<b>description:</b> ' + e.features[0].properties.description)
                .addTo(map);
            });

      },
    });

}

function getAllCrimesCluesters() {
    var e = document.getElementById("crimeTypeSelect");
    var strUser = e.options[e.selectedIndex].value;

    $.ajax({
      type: "POST",
      url: "/crimes",
      data: {"crime_type": strUser},
      dataType: 'text',
      success: function(result) {
            dataCrimes = result.split(';');
            for (i = 0; i < dataCrimes.length-1; i++)
                dataCrimes[i] = JSON.parse(dataCrimes[i])
            
            map.addSource("crimesData", {
                type: "geojson",
                // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
                // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
                data: {
                    "type": "FeatureCollection",
                    "crs": { 
                          "type": "name", 
                          "properties": { 
                                "name": "urn:ogc:def:crs:OGC:1.3:CRS84" 
                          },
                    },
                    "features": dataCrimes
                },
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
            });

            map.addLayer({
                id: "crime_clusters",
                type: "circle",
                source: "crimesData",
                filter: ["has", "point_count"],
                paint: {
                    // Use step expressions (https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    "circle-color": [
                        "step",
                        ["get", "point_count"],
                        "#51bbd6",
                        100,
                        "#f1f075",
                        750,
                        "#f28cb1"
                    ],
                    "circle-radius": [
                        "step",
                        ["get", "point_count"],
                        20,
                        100,
                        30,
                        750,
                        40
                    ]
                }
            });

            map.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "crimesData",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                    "text-size": 12
                }
            });

            map.addLayer({
                id: "unclustered-point",
                type: "circle",
                source: "crimesData",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-color": "#11b4da",
                    "circle-radius": 4,
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#fff"
                }
            });

            // inspect a cluster on click
            map.on('click', 'clusters', function (e) {
                var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                var clusterId = features[0].properties.cluster_id;
                map.getSource('earthquakes').getClusterExpansionZoom(clusterId, function (err, zoom) {
                    if (err)
                        return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                });
            });

            // Change the cursor to a pointer when the mouse is over the places layer.
            map.on('mouseenter', 'clusters', function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            // Change it back to a pointer when it leaves.
            map.on('mouseleave', 'clusters', function () {
                map.getCanvas().style.cursor = '';
            });

            map.on('click', 'unclustered-point', function (e) {
                var coordinates = e.features[0].geometry.coordinates.slice();
                var description = e.features[0].properties.description;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML('<b>description:</b> ' + description)
                    .addTo(map);
            });

      },
    });

}

function getAllCrimesInPolygons() {
    var e = document.getElementById("crimeTypeSelect");
    var strUser = e.options[e.selectedIndex].value;

    $.ajax({
      type: "POST",
      url: "/crimes_polygon",
      data: {"crime_type": strUser},
      dataType: 'text',
      success: function(result) {
            dataCrimes = result.split(';');
            for (i = 0; i < dataCrimes.length-1; i++)
                dataCrimes[i] = JSON.parse(dataCrimes[i])
            console.log(dataCrimes.length)
            map.addLayer({
              'id': 'maine',
              'type': 'fill',
              'source': {
                  type: 'geojson',
                  data: {
                      "type": "FeatureCollection",
                      "features": dataCrimes
                  },
              },
                  'layout': {},
                  'paint': {
                      'fill-opacity': 0.8,
                      'fill-color': [
                          'step',
                          ['get', 'count'],
                          '#fbb03b',
                          10,
                          '#223b53',
                          50, 
                          '#e55e5e',
                          150,
                          '#3bb2d0',
                          300,
                          /* other */ '#ccc'
                      ]
                  }
          });
      },
    });

}

function myAccFuncPoint() {
    var x = document.getElementById("CHAcc");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
    } else { 
        x.className = x.className.replace(" w3-show", "");
        x.previousElementSibling.className = 
        x.previousElementSibling.className.replace(" w3-green", "");
    }
}

function myAccFuncPol() {
    var x = document.getElementById("PAcc");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
    } else { 
        x.className = x.className.replace(" w3-show", "");
        x.previousElementSibling.className = 
        x.previousElementSibling.className.replace(" w3-green", "");
    }
}
