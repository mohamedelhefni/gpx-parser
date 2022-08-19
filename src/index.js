import { parseString } from "xml2js"

class GPXParser {
  #parsedXml;
  #metadata;
  #waypoints;
  #routes;
  #tracks;
  constructor() {
    this.#parsedXml = null;
    this.#metadata = null;
    this.#waypoints = []
    this.#routes = []
    this.#tracks = []
  }

  #parseXml(xmlString) {
    let savedThis = this
    parseString(xmlString, function(err, result) {
      if (err) {
        console.log(err)
        return
      }
      savedThis.#parsedXml = result
    })
  }

  #parseMetadata() {
    let parsedMeta = this.#parsedXml.gpx?.metadata?.[0]
    let metadata = {}
    metadata.name = parsedMeta?.name?.[0]
    metadata.desc = parsedMeta?.desc?.[0]
    metadata.author = parsedMeta?.author?.[0]
    metadata.time = parsedMeta?.time?.[0]
    this.#metadata = metadata
  }

  #parseWaypoints() {
    this.#waypoints = this.#parsedXml.gpx?.wpt?.map((wp) => {
      let waypoint = {}
      waypoint.lat = parseFloat(wp.$.lat)
      waypoint.lon = parseFloat(wp.$.lon)
      waypoint.name = wp.name
      waypoint.desc = wp.desc
      waypoint.time = wp.time
      waypoint.ele = wp.ele
      return waypoint
    })
  }

  #distance(point1, point2) {
    let lat1 = point1.lat
    let lon1 = point1.lon
    let lat2 = point2.lat
    let lon2 = point2.lon
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
      c(lat1 * p) * c(lat2 * p) *
      (1 - c((lon2 - lon1) * p)) / 2;

    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  }

  #getDistance(points) {
    let distance = {}
    let totalDistance = 0.0;
    let cumulDitance = []
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.#distance(points[i], points[i + 1]);
      cumulDitance[i] = totalDistance
    }

    distance.total = totalDistance;
    distance.cumul = cumulDitance
    return distance
  }

  #parseRoutes() {
    this.#parsedXml.gpx?.rte?.map(rt => {
      let route = {}
      route.name = rt.name?.[0]
      route.number = rt.number?.[0]
      route.cmt = rt.cmt?.[0]
      route.desc = rt.desc?.[0]
      route.src = rt.src?.[0]
      if (route.link) {
        route.link = {}
        route.link.href = rt.link[0].$.href
        route.link.text = rt.link[0].text?.[0]
        route.link.type = rt.link[0].type?.[0]
      }

      route.points = rt.rtept.map(p => {
        let point = {}
        point.lat = parseFloat(p.$.lat)
        point.lon = parseFloat(p.$.lon)
        point.name = p.name
        point.time = p.time
        point.ele = p.ele
        return point
      })
      route.distance = this.#getDistance(route.points)
      this.#routes.push(route)
    })
  }
  #parseTracks() {
    this.#parsedXml.gpx?.trk?.map(trk => {
      let track = {}
      track.name = trk.name?.[0]
      track.number = trk.number?.[0]
      track.cmt = trk.cmt?.[0]
      track.desc = trk.desc?.[0]
      track.src = trk.src?.[0]
      if (trk.link) {
        track.link = {}
        track.link.href = trk.link[0].$.href
        track.link.text = trk.link[0].text?.[0]
      }
      track.segments = trk.trkseg.map(seg => {
        let segment = {}
        segment.points = seg.trkpt.map(p => {
          let point = {}
          point.lat = parseFloat(p.$.lat)
          point.lon = parseFloat(p.$.lon)
          point.name = p.name
          point.time = p.time
          point.ele = p.ele
          return point
        })
        segment.distance = this.#getDistance(segment.points)
        return segment
      })
      this.#tracks.push(track)
    })
  }

  parse(xmlString) {
    this.#parseXml(xmlString)
    this.#parseMetadata()
    this.#parseWaypoints()
    this.#parseRoutes()
    this.#parseTracks()
  }

  #removeUndefined(arr) {
    if (arr === undefined) {
      return
    }
    arr.forEach(obj => {
      Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key])
    })
    return arr
  }
  getMetadata() {
    return this.#removeUndefined(this.#metadata)
  }

  getWaypoints() {
    return this.#removeUndefined(this.#waypoints)
  }

  getRoutes() {
    return this.#removeUndefined(this.#routes)
  }

  getTracks() {
    return this.#removeUndefined(this.#tracks)
  }

  toGeoJson() {
    let GeoJSON = {
      "type": "FeatureCollection",
      "features": [],
      "properties": {
        "name": this.#metadata.name,
        "desc": this.#metadata.desc,
        "time": this.#metadata.time,
        "author": this.#metadata.author,
        "link": this.#metadata.link,
      },
    }
    this.#tracks.map(track => {
      let feature = {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": []
        },
        "properties": {
        }
      }
      feature.properties.name = track.name;
      feature.properties.cmt = track.cmt;
      feature.properties.desc = track.desc;
      feature.properties.src = track.src;
      feature.properties.number = track.number;
      feature.properties.link = track.link;
      feature.properties.type = track.type;

      track.segments.map(seg => {
        seg.points.map(pt => {
          var geoPt = [];
          geoPt.push(pt.lon);
          geoPt.push(pt.lat);
          geoPt.push(pt.ele);
          feature.geometry.coordinates.push(geoPt);
        })
      })
      GeoJSON.features.push(feature);
    })

    this.#routes.map(route => {
      let feature = {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": []
        },
        "properties": {
        }
      }
      feature.properties.name = route.name;
      feature.properties.cmt = route.cmt;
      feature.properties.desc = route.desc;
      feature.properties.src = route.src;
      feature.properties.number = route.number;
      feature.properties.link = route.link;
      feature.properties.type = route.type;
      route.points.map(pt => {
        var geoPt = [];
        geoPt.push(pt.lon);
        geoPt.push(pt.lat);
        geoPt.push(pt.ele);
        feature.geometry.coordinates.push(geoPt);
      })
      GeoJSON.features.push(feature);
    })

    return GeoJSON;

  }
}

export { GPXParser }
