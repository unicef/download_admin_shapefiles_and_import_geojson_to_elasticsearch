// Downloads shapefiles for all countries.
// Generates geojson files
var azure = require('./lib/azure');
var config = require('./config');
var ArgumentParser = require('argparse').ArgumentParser;
var container_name = 'shapefiles';
var fs = require('fs');
var geo = require('./lib/geojsonize');
var geojson_container = config.geojson_dir;
var request = require('request');
var temp_storage = config.temp_storage;
var zips_dir = temp_storage + 'zipfiles';
var country_codes = require('./lib/country_codes');
var async = require('async');
var bluebird = require('bluebird');
var mkdirp = require('mkdirp');

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-s', '--save_to_cloud'],
  {help: 'Boolean: save to cloud'}
);
var args = parser.parseArgs();
var save_to_azure = args.save_to_cloud;

var shapefiles_url = config.shapefile_url;

async.waterfall([
  // Create container for geojson if it doesn't already exist
  function(callback) {
    if (save_to_azure) {
      azure.create_storage_container(geojson_container)
      .catch(console.log)
      .then(()=> {callback();});
    } else {
      callback();
    }
  },

  // Create container for shapefiles if it doesn't already exist.
  function(callback) {

    if (save_to_azure) {
      azure.create_storage_container('shapefiles')
      .catch(console.log)
      .then(() => {callback();});
    } else {
      callback();
    }
  },

  function(callback) {
    console.log('222')
    mkdirp(temp_storage + geojson_container, function (err) {
      if (err) {
        console.log(err);
      }
      callback();
    });
  },

  function(callback) {
    mkdirp(temp_storage + 'zipfiles', function (err) {
      if (err) {
        console.log(err);
      }
      callback();
    });
  },

  function(callback) {
    mkdirp(temp_storage + 'unzipped', function (err) {
      if (err) {
        console.log(err);
      }
      callback();
    });
  },

  /**
   * Get list of countries you need shapefiles for, then fetch them.
   * TODO Destroy local file on upload complete
   * @param{String} country_codes - array of 3 letter country ISO code taken from wikipedia
   * @return{Promise} Fulfilled with result of azure upload
   */

  function(callback) {
  // list = ['CAN', 'AUS'];
  // Uncomment to compare with what's in Azure storage
  // azure.get_list_of_countries_to_fetch(geojson_container, country_codes)
  // .then(function(list) {
    bluebird.each(country_codes, function(e, i) {
      console.log('Processing', e, i);
      return download_shapefile_then_process(e);
    }, {concurrency: 1})
    .catch(console.log)
    .then(callback);
  }

], function(err) {
  console.log("***", !!err)
  if (err) {
    console.log(err);
  }
  console.log('All done!');
  process.exit();
});

/**
 * Downloads shape file.
 * @param{String} country_code - 3 letter country ISO code
 * @return{Promise} Fulfilled with result of azure upload
 */
function download_shapefile_then_process(country_code){
  return new Promise(function(resolve, reject){
    var url = shapefiles_url + country_code + '_adm_shp.zip';
    var output = zips_dir + '/' + country_code + '.zip';
    console.log('Downloading', country_code);
    request({url: url, encoding: null}, function(err, resp, body) {
      if ( resp.statusCode != 200) {
        console.log('NOGO!', country_code);
        return resolve();
      }

      if (err) {
        return reject(err);
      }
      console.log('About to write to file')
      fs.writeFile(output, body, function(err) {
        if (err) throw err;
        console.log('File saved.');
        process_zip(country_code).then(function() {
          setTimeout(function() {
            console.log('wait...');
            resolve();
          }, 2000);
        });
      });
    });
  });
}

/**
 * Unzips shapefile, creates geojson version, and uploads it to blob
 * TODO Destroy local file on upload complete
 * @param{String} country_code - 3 letter country ISO code
 * @return{Promise} Fulfilled with result of azure upload
 */
function process_zip(country_code){
  return new Promise(function(resolve){
    async.waterfall([
      function(callback) {
        if (save_to_azure) {
          azure.upload_blob(container_name, country_code, zips_dir, 'zip')
          .catch(console.log)
          .then(() => {callback();});
        } else {
          callback();
        }
      },

      function(callback) {
        geo.unzip_and_geojson(country_code, zips_dir)
        .then(callback);
      }
    ], function(err) {
      if (err) {
        console.log(err);
      }
      console.log('All done!');
      resolve();
    });
  });
}
