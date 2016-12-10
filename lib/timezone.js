var turf = require('turf');
var geojsonArea = require('geojson-area');
var jsts = require('jsts');
var geojsonReader = new jsts.io.GeoJSONReader();
var timezones = require('./world/tz_world_mp.json');
var tz_polygons = timezones.features.map(function(n) {
  return n.geometry;
});

var jstsPolygons = tz_polygons.map(function(polygon, index) {
  var jstsPolygon = geojsonReader.read({
    type: polygon.type,
    coordinates: polygon.coordinates
  });
  jstsPolygon.__index = index;
  return jstsPolygon;
});

exports.add_timezone = function(admin) {
  // admin polygon
  var jPolygon = geojsonReader.read(admin.geometry);
  // Timezones that admin geometry intersects
  var matches = jstsPolygons.filter(function(jstsPolygon) {
    return jPolygon.intersects(jstsPolygon);
  });
  // Return names of timezones and their percentage of coverage
  return matches.map(function(m) {
    var tz_polygon = timezones.features[m.__index];
    var intersection = turf.intersect(admin, tz_polygon);
    var area_intersection = geojsonArea.geometry(intersection.geometry);
    var area_admin = geojsonArea.geometry(admin.geometry);
    var percent_admin_covered_by_tz = (area_intersection / area_admin) * 100;
    return {properties: tz_polygon.properties, percent_covered: percent_admin_covered_by_tz};
  });
};
