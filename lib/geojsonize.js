var azure = require('./azure');
var extract = require('extract-zip');
var fs = require('fs');
var mkdirp = require('mkdirp');
var ogr2ogr = require('ogr2ogr');

/**
 * Unzipes shapefile and creates geojson
 * @param{String} country_code - 3 letter ISO country code
 * @param{String} local_dir - Directory where shapefile zip is located.
 * @return{Promise} Fulfilled -
 */
exports.unzip_and_geojson = function(country_code, local_dir) {
  return new Promise(function(resolve){
    mkdirp('./unzipped/' + country_code, function() {
      console.log('Begin store to unzip', country_code);
      var path = local_dir + '/' + country_code + '.zip';
      extract(path, {dir: './unzipped/' + country_code }, function () {
        geojsonize_and_upload_blob(country_code, 1)
        .then(function(){
          geojsonize_and_upload_blob(country_code, 2);
        }).then(function(){
          resolve();
        });
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
function geojsonize_and_upload_blob(country_code, admin_level){
  var input = './unzipped/' + country_code + '/' + country_code + '_adm' + admin_level + '.shp';
  var output = './geojson/' + country_code + '_' + admin_level + '.geojson';
  return new Promise(function(resolve){
    if (fs.existsSync(input) ) {
      var ogr = ogr2ogr(input);
      ogr.exec(function (er, data) {
        fs.writeFile(output, JSON.stringify(data), function(err) {
          if (err) throw err;
          console.log('File saved.');
          azure.upload_blob('geojson', country_code + '_' + admin_level, './geojson', 'geojson').then(function(){
            resolve();
          });
        });
      });
    } else {
      resolve();
    }
  });
}
