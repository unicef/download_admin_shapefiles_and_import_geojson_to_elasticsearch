var fs = require('fs');
var jsonfile = require('jsonfile');
var topojson = require('topojson');
var ArgumentParser = require('argparse').ArgumentParser;
var bluebird = require('bluebird');
var async = require('async');

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
var geo_files = fs.readdirSync(data_dir + source);

bluebird.each(geo_files, f => {
  return process_file(f);
}, {concurrency: 1}).then(() => {
  console.log('done!');
});

function process_file(f) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      function(callback) {
        read_jsonfile(data_dir + source + '/' + f)
        .then(geojson => {
          callback(null, geojson);
        });
      },
      function(geojson, callback) {
        topojsonize(geojson, f)
        .then(callback);
      }
    ], function (err, result) {
      resolve();
    });
  })
}

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

    jsonfile.writeFile(topo_source_dir + '/' + f, c, (err, data) => {
      console.log(err, data)
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
function read_jsonfile(geojson) {
  console.log(geojson, '!!!')
  return new Promise(function(resolve, reject) {
    jsonfile.readFile(geojson, function(err, feature_collection) {
      if (err) {
        return reject(err);
      }
      resolve(feature_collection);
    });
  });
}
