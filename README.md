# GPX Parser

a library for parsing gpx files and extract data that provide functionalities  
* extract gpx metadata and waypoints
* extract tracks and routes with points and total distance of the route
* convert the gpx to geojson 

## Install 
`npm i gpxtojs`

## Usage
```js
const gpxtojs = require("gpxtojs")
const gpx = new gpxtojs.GPXParser();
gpx.parse(gpxString)
gpx.getMetadata()
gpx.getWaypoints()
gpx.getTracks()
gpx.getRoutes()
```

### Convert to Geojson
```js
gpx.toGeoJson()
```



