var markers = [];
var dataCrimes = [];
var dataPolygonCrimes = [];

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
    markers = [];
    if (map.getLayer('metro-lines')) {
        map.removeLayer('metro-lines');
    }
    if (map.getSource('lines')) {
        map.removeSource('lines');
    }
    if (map.getLayer('crime-point')) {
        map.removeLayer('crime-point');
    }
    if (map.getLayer('crime-heat')) {
        map.removeLayer('crime-heat');
    }
    if (map.getSource('crimes')) {
        map.removeSource('crimes');
    }

    document.getElementById("mySidebar").style.display = "none";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function monthsPlayer() {
    map.setFilter('crime-heat', null);
    map.setFilter('crime-point', null);
    const sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    e = document.getElementById("crimeMonthSelect");
    for (i = 1; i <= 12; i++) {
      await sleep(1100);
      var month = e.options[i].value;
      var filterMonth = ['==', ['string', ['get', 'month']], month];
      map.setFilter('crime-heat', filterMonth);
      map.setFilter('crime-point', filterMonth);
    }
    await sleep(1100);
    map.setFilter('crime-heat', null);
    map.setFilter('crime-point', null);
}

function mapFilters() {
    if (map.getLayer('crime-heat')) {
      var e = document.getElementById("crimeTypeSelect");
      var cType = e.options[e.selectedIndex].value;
      e = document.getElementById("crimeMonthSelect");
      var month = e.options[e.selectedIndex].value;

      var filterType = ['==', ['string', ['get', 'crime-type']], cType];
      var filterMonth = ['==', ['string', ['get', 'month']], month];

      if (cType == 1 && month == 0) {
        map.setFilter('crime-heat', null);
        map.setFilter('crime-point', null);
      } else if (cType == 1) {
        map.setFilter('crime-heat', filterMonth);
        map.setFilter('crime-point', filterMonth);
      } else if (month == 0) {
        map.setFilter('crime-heat', filterType);
        map.setFilter('crime-point', filterType);
      } else {
        map.setFilter('crime-heat', ['all', filterType, filterMonth]);
        map.setFilter('crime-point', ['all', filterType, filterMonth]);
      }
    }
}

document.getElementById('crimeTypeSelect').addEventListener('change', function(e) {
    mapFilters();
});

document.getElementById('crimeMonthSelect').addEventListener('change', function(e) {
    mapFilters();
});

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
                'id': 'metro-lines',
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

    if (map.getLayer('crime-heat'))
        return;

    map.addSource('crimes', {
        type: 'geojson',
        data: {
            "type": "FeatureCollection",
            "features": dataCrimes
        }
    });

    map.addLayer({
        id: 'crime-heat',
        type: 'heatmap',
        source: 'crimes',
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
        id: 'crime-point',
        type: 'circle',
        source: 'crimes',
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

    mapFilters();

    map.on('click', 'crime-point', function(e) {
        new mapboxgl.Popup()
            .setLngLat(e.features[0].geometry.coordinates)
            .setHTML('<b>description:</b> ' + e.features[0].properties.description)
            .addTo(map);
    });
}

function getAllCrimesInPolygons() {
    var e = document.getElementById("crimeTypePolygonSelect");
    var strUser = e.options[e.selectedIndex].value;

    $.ajax({
      type: "POST",
      url: "/crimes_polygon",
      data: {"crime_type": strUser},
      dataType: 'text',
      success: function(result) {
            dataPolygonCrimes = result.split(';');
            for (i = 0; i < dataPolygonCrimes.length-1; i++)
                dataPolygonCrimes[i] = JSON.parse(dataPolygonCrimes[i])

            map.addLayer({
              'id': 'polygons',
              'type': 'fill',
              'source': {
                  type: 'geojson',
                  data: {
                      "type": "FeatureCollection",
                      "features": dataPolygonCrimes
                  },
              },
              'layout': {},
              'paint': {
                  'fill-opacity': 0.7,
                  'fill-color': [
                      'step',
                      ['get', 'ratio'],
                      '#FFEDA0',
                      10,
                      '#FED976',
                      30,
                      '#FEB24C',
                      70,
                      '#FD8D3C',
                      140,
                      '#FC4E2A',
                      210,
                      '#E31A1C',
                      500,
                      '#BD0026',
                      700,
                      '#800026'
                  ]
              }
            });

            map.on('click', 'polygons', function(e) {

              function findCenter (arr)
              {
                  var minX, maxX, minY, maxY;
                  for (var i = 0; i < arr.length; i++)
                  {
                      minX = (arr[i][0] < minX || minX == null) ? arr[i][0] : minX;
                      maxX = (arr[i][0] > maxX || maxX == null) ? arr[i][0] : maxX;
                      minY = (arr[i][1] < minY || minY == null) ? arr[i][1] : minY;
                      maxY = (arr[i][1] > maxY || maxY == null) ? arr[i][1] : maxY;
                  }
                  return [(minX + maxX) / 2, (minY + maxY) / 2];
              }
              center = findCenter(e.features[0].geometry.coordinates[0])

              new mapboxgl.Popup()
                .setLngLat(center)
                .setHTML('<b>count:</b> ' + e.features[0].properties.count)
                .addTo(map);
            });
      },
    });
}

function myAccFuncPoint() {
    var x = document.getElementById("CHAcc");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
        $.ajax({
          type: "POST",
          url: "/crimes",
          data: {"crime_type": "1"},
          dataType: 'text',
          success: function(result) {
                dataCrimes = result.split(';');
                for (i = 0; i < dataCrimes.length-1; i++)
                    dataCrimes[i] = JSON.parse(dataCrimes[i])
          },
        });
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

function myAccFuncOverTime() {
    var x = document.getElementById("POTAcc");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
        getAllCrimesHeatMap();
    } else { 
        x.className = x.className.replace(" w3-show", "");
        x.previousElementSibling.className = 
        x.previousElementSibling.className.replace(" w3-green", "");
    }
}

