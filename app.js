// Downloads shapefiles for all countries.
// Generates geojson files
var azure = require('./lib/azure');
var config = require('./config');
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

var shapefiles_url = config.shapefile_url;

async.waterfall([
  // Create container for geojson if it doesn't already exist
  function(callback) {
    azure.create_storage_container(geojson_container)
    .catch(function(err) {
      console.log(err);
    })
    .then(function(){
      callback();
    });
  },

  // Create container for shapefiles if it doesn't already exist.
  function(callback) {
    azure.create_storage_container('shapefiles')
    .catch(function(err) {
      console.log(err);
    })
    .then(function() {
      callback();
    });
  },

  function(callback) {
    mkdirp(temp_storage + geojson_container, function (err) {
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
    // Uncomment to compare with what's in Azure storage
    // azure.get_list_of_countries_to_fetch(geojson_container, country_codes)
    // .then(function(list) {
      var list = country_codes;
      bluebird.map(list, function(e) {
        return download_shapefile_then_process(e);
      }, {concurrency: 1})
      .catch(function(err) {console.log(err); })
      .then(function(){
        callback();
      });
    // });
  },

], function(err) {
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
        resolve();
      }

      if (err) {
        return reject(err);
      }

      fs.writeFile(output, body, function(err) {
        if (err) throw err;
        console.log('File saved.');
        process_zip(country_code).then(function() {
          setTimeout(function() {
            console.log('wait...'); resolve();
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
    // azure.upload_blob(container_name, country_code, zips_dir, 'zip')
    // .catch(function(err) { console.log(err);})
    // .then(function() {
      geo.unzip_and_geojson(country_code, zips_dir).then(function(){
        resolve();
      });
    // });
  });
}
