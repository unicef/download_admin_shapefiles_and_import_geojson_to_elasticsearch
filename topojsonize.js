var fs = require('fs');
var jsonfile = require('jsonfile');
var topojson = require('topojson');
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-s', '--source'],
  {help: 'String: shapefile set source'}
);
var args = parser.parseArgs();
var source = args.source;

var data_dir = './data/';
var topo_data_dir = data_dir + 'topojson/';
var topo_source_dir = topo_data_dir + source;

if (!fs.existsSync(data_dir)){
  fs.mkdirSync(data_dir);
}

if (!fs.existsSync(topo_data_dir)){
  fs.mkdirSync(topo_data_dir);
}

if (!fs.existsSync(topo_source_dir)){
  fs.mkdirSync(topo_source_dir);
}
fs.readdirSync(data_dir + source).forEach(f => {
  read_jsonfile(data_dir + source + '/' + f)
  .then(geojson => {
    topojsonize(geojson, f);
  })
});

function topojsonize(feature_collection, f) {
  return new Promise(function(resolve, reject) {
    // root is directory where topojson will be stored.
    var c = topojson.topology(
      {collection: feature_collection},
      {
        'property-transform': function(object) {
          return object.properties
        }
      });
    // var unsimplified = JSON.parse(JSON.stringify(c));  // copy data
    topojson.simplify(c, {
      'coordinate-system': 'spherical',
      'retain-proportion': 0.4
    });

    jsonfile.writeFile(topo_source_dir + '/' + f, c, (err) => {
      console.log(err)
      resolve();
    });
  });
}

/**
 * Read geojson file
 *
 * @param{string} geojson - geojson file with path
 * @param{bool} verbose - Option to display debug
 * @return{Promise} Fulfilled when geojson is returned.
 */
function read_jsonfile(geojson, verbose) {
  return new Promise(function(resolve, reject) {
    jsonfile.readFile(geojson, function(err, feature_collection) {
      if (err) {
        return reject(err);
      }

      if (verbose) {
        console.log('file read');
      }
      resolve(feature_collection);
    });
  });
}
