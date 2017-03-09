var azure = require('./azure');
var bluebird = require('bluebird');
var config = require('../config');
var extract = require('extract-zip');
var fs = require('fs');
var geojson_container = config.geojson_dir;
var mkdirp = require('mkdirp');
var ogr2ogr = require('ogr2ogr');
var temp_storage = config.temp_storage;

/**
 * Unzipes shapefile and creates geojson
 * @param{String} country_code - 3 letter ISO country code
 * @param{String} local_dir - Directory where shapefile zip is located.
 * @return{Promise} Fulfilled -
 */
exports.unzip_and_geojson = function(country_code, local_dir) {
  return new Promise(function(resolve, reject) {
    mkdirp(temp_storage + 'unzipped/' + country_code, function(err) {
      if (err){
        console.log(err);
        return reject(err);
      }
      console.log('Begin store to unzip', country_code);
      var path = local_dir + '/' + country_code + '.zip';
      extract(path, {dir: temp_storage + '/unzipped/' + country_code }, function () {
        bluebird.each([0,1,2,3,4,5,6,7,8,9,10], level => {
          return geojsonize_and_upload_blob(country_code, level)
        }, {concurrency: 1})
        .then(resolve);
      });
    });
  });
};

/**
 * Unzipes shapefile and creates geojson
 * @param{String} country_code - 3 letter ISO country code
 * @param{String} admin_level - Level of admin
 * @return{Promise} Fulfilled -
 */
function geojsonize_and_upload_blob(country_code, admin_level) {
  var input = temp_storage + 'unzipped/' + country_code + '/' + country_code + '_adm' + admin_level + '.shp';
  var output = temp_storage + geojson_container + '/' + country_code + '_' + admin_level + '.json';
  return new Promise(function(resolve, reject) {
    if (fs.existsSync(input)) {
      var ogr = ogr2ogr(input);
      ogr.exec(function (er, data) {
        fs.writeFile(output, JSON.stringify(data), function(err) {
          if (err) throw err;
          console.log('File saved.');
          // azure.upload_blob(geojson_container, country_code + '_' + admin_level, temp_storage + geojson_container, 'geojson')
          // .catch(function(err){
          //   return reject(err);
          // })
          // .then(function() {
            resolve();
          // });
        });
      });
    } else {
      resolve();
    }
  });
}
