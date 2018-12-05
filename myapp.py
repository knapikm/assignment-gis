#!/usr/bin/python3

import os
import os.path
import string
import cherrypy
import psycopg2
import json
import re


def metro_stations():
    try:
        conn = psycopg2.connect("dbname='pdt' \
               user='postgres' host='localhost' password=''")
    except:
        print("I am unable to connect to the database")

    #  cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur = conn.cursor()  # set cursor
    try:
        #cur.execute("""SELECT ST_X (ST_Transform (way, 4326)), ST_Y (ST_Transform (way, 4326)) FROM planet_osm_point WHERE railway = 'subway_entrance';""")
        cur.execute("""SELECT DISTINCT ON (res.id) res.name, res.lat, res.lon FROM (
                            SELECT poi.*, ST_DWithin(ST_Transform(road.way::geometry, 3857), ST_Transform(poi.geom::geometry, 3857), 1000) AS in_dist
                            FROM planet_osm_roads as road, metro_stations as poi
                            WHERE road.railway LIKE '%subway%'
                        ) AS res WHERE res.in_dist = true;""")
    except:
        print("I can't SELECT from planet_osm_point, metro_stations")

    rows = cur.fetchall()
    conn.close()

    finalJson = []
    for row in rows:
        finalJson.append(json.dumps(
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [row[2], row[1]]
            }
        }))
        finalJson.append(';')
    return finalJson


def get_line_coord(data):
    data = data.replace("(","").replace(")","")[10:].split(",")
    return [p.split() for p in data]


def metro_lines():
    try:
        conn = psycopg2.connect("dbname='pdt' \
               user='postgres' host='localhost' password=''")
    except:
        print("I am unable to connect to the database")

    #  cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur = conn.cursor()  # set cursor
    try:
        cur.execute("""SELECT ST_AsText(way), name, oneway, service, z_order FROM planet_osm_roads WHERE railway = 'subway';""")
    except:
        print("I can't SELECT from planet_osm_roads")

    rows = cur.fetchall()
    conn.close()

    colors = ['Red', 'Green', 'Yellow', 'Blue', 'Orange', 'Silver', 'Bridge']
    colors_codes = {
        'Blue': '#1E90FF',
        'Red': '#F7455D',
        'Green': '#32CD32',
        'Yellow': '#FFFF00',
        'Bridge': '#FFFF00',
        'Orange': '#FF8C00',
        'Silver': '#C0C0C0',
        'Black': '#000000'
    }
    finalJson = []
    for row in rows:
        points = get_line_coord(row[0])
        if row[1] is not None:
            color = re.findall(re.compile("|".join(colors)), row[1])
        if len(color) == 0:
            print(row)
            color = ['Black']
        finalJson.append(json.dumps(
        {
            'type': 'Feature',
            'properties': {
                'color': colors_codes[color[0]]
            },
            'geometry': {
                'type': 'LineString',
                'coordinates': points
            }
        }))
        finalJson.append(';')
    return finalJson


def crimes(crime_type):
    try:
        conn = psycopg2.connect("dbname='pdt' \
               user='postgres' host='localhost' password=''")
    except:
        print("I am unable to connect to the database")

    #  cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur = conn.cursor()  # set cursor
    try:
        if crime_type == '1':
            cur.execute("""SELECT y, x, reportdatetime, offense, method, to_char(start_date, 'MM') FROM crime_incidents;""")
        else:
            offense_type = {
                '2': 'THEFT/OTHER',
                '3': 'THEFT F/AUTO',
                '4': 'ASSAULT W/DANGEROUS WEAPON',
                '5': 'BURGLARY',
                '6': 'ARSON',
                '7': 'HOMICIDE',
                '8': 'ROBBERY',
                '9': 'SEX ABUSE',
                '10': 'MOTOR VEHICLE THEFT',
            }
            cur.execute("""SELECT y, x, reportdatetime, offense, method, to_char(start_date, 'MM') FROM crime_incidents WHERE offense Like %s;""", (offense_type[crime_type],))
    except:
        print("I can't SELECT from crime_incidents")

    rows = cur.fetchall()
    conn.close()

    crime_type = {
                    'THEFT/OTHER': '2',
                    'THEFT F/AUTO': '3',
                    'ASSAULT W/DANGEROUS WEAPON': '4',
                    'BURGLARY': '5',
                    'ARSON': '6',
                    'HOMICIDE': '7',
                    'ROBBERY': '8',
                    'SEX ABUSE': '9',
                    'MOTOR VEHICLE THEFT': '10',
                }
    finalJson = []
    for row in rows:
        finalJson.append(json.dumps(
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [row[1], row[0]]
            },
            'properties': {
                'title': row[3],
                'description': row[3] + ', ' + str(row[2]) + ', method: ' + row[4],
                'crime-type': crime_type[row[3]],
                'month': row[5]
            }
        }))
        finalJson.append(';')
    return finalJson


def get_poly_coord(data):
    data = data.replace("(","").replace(")","")[7:].split(",")
    return [p.split() for p in data]


def crimes_in_polygons(crime_type):
    try:
        conn = psycopg2.connect("dbname='pdt' \
               user='postgres' host='localhost' password=''")
    except:
        print("I am unable to connect to the database")

    #  cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur = conn.cursor()  # set cursor
    try:
        if crime_type == '1':
            cur.execute("""SELECT ST_AsText(res.way), count(res.*), ST_Area(geography(res.way)), count(res.*) / ST_Area(geography(res.way)) * 1000000 as crime_per_size FROM (
                                SELECT pol.osm_id, pol.way, ST_Contains(pol.way, ci.way) as is_in
                                FROM planet_osm_polygon as pol, crime_incidents as ci
                                WHERE pol.boundary = 'neighborhood' OR pol.boundary = 'protected_area' OR pol.boundary = 'suburb' OR pol.boundary = 'borough'
                            ) AS res WHERE is_in = true GROUP BY res.osm_id, res.way;""")
        else:
            offense_type = {
                '2': 'THEFT/OTHER',
                '3': 'THEFT F/AUTO',
                '4': 'ASSAULT W/DANGEROUS WEAPON',
                '5': 'BURGLARY',
                '6': 'ARSON',
                '7': 'HOMICIDE',
                '8': 'ROBBERY',
                '9': 'SEX ABUSE',
                '10': 'MOTOR VEHICLE THEFT',
            }
            print(offense_type[crime_type])
            cur.execute("""SELECT ST_AsText(res.way), count(res.*), ST_Area(geography(res.way)), count(res.*) / ST_Area(geography(res.way)) * 1000000 as crime_per_size FROM (
                                SELECT pol.osm_id, pol.way, ST_Contains(pol.way, ci.way) as is_in
                                FROM planet_osm_polygon as pol, crime_incidents as ci
                                WHERE ci.offense LIKE %s AND (pol.boundary = 'neighborhood' OR pol.boundary = 'protected_area' OR pol.boundary = 'suburb' OR pol.boundary = 'borough')
                           ) AS res WHERE is_in = true GROUP BY res.osm_id, res.way;""", (offense_type[crime_type],))
    except:
        print("I can't SELECT from planet_osm_polygon, crime_incidents")

    rows = cur.fetchall()
    conn.close()

    finalJson = []
    for row in rows:
        points = get_poly_coord(row[0])
        finalJson.append(json.dumps(
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [points]
            },
            'properties': {
                'count': row[1],
                'size': row[2],
                'ratio': row[3],
            }
        }))
        finalJson.append(';')
    return finalJson


class Gis(object):
    @cherrypy.expose
    def index(self):
        return open('index.html')


@cherrypy.expose
class MetroLinesWebService(object):

    @cherrypy.tools.accept(media='text/plain')
    def GET(self):
        return metro_lines()


@cherrypy.expose
class MetroStationsWebService(object):

    @cherrypy.tools.accept(media='text/plain')
    def GET(self):
        return metro_stations()


@cherrypy.expose
class CrimesWebService(object):

    @cherrypy.tools.accept(media='text/plain')
    def POST(self, crime_type=None):
        return crimes(crime_type)


@cherrypy.expose
class PolygonCrimesWebService(object):

    @cherrypy.tools.accept(media='text/plain')
    def POST(self, crime_type=None):
        return crimes_in_polygons(crime_type)
        

if __name__ == '__main__':
    conf = {
        '/': {
            'tools.sessions.on': True,
            'tools.staticdir.root': os.path.abspath(os.getcwd())
        },
        '/metro_stations': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Content-Type', 'text/plain')],
        },
        '/metro_lines': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Content-Type', 'text/plain')],            
        },
        '/crimes': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Content-Type', 'text/plain')],
        },
        '/crimes_polygon': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Content-Type', 'text/plain')],
        },
        '/static': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': './public'
        }
    }

webapp = Gis()
webapp.metro_stations = MetroStationsWebService()
webapp.metro_lines = MetroLinesWebService()
webapp.crimes = CrimesWebService()
webapp.crimes_polygon = PolygonCrimesWebService()
cherrypy.quickstart(webapp, '/', conf)
