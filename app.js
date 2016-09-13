var azure = require('./lib/azure');
var config = require('./config');
var container_name = 'shapefiles';
var fs = require('fs');
var geo = require('./lib/geojsonize');
var request = require('request');
var zips_dir = 'zipfiles';
var country_codes = require('./country_codes');

var shapefiles_url = config.shapefile_url;

// Program begins here.
azure.create_storage_container('geojson').then(function(){
  azure.create_storage_container(container_name).then(function(){
    // Retrieve list of files already in blob, so you only process absent ones.
    azure.get_list_of_countries_to_fetch('geojson', country_codes).then(function(){
      var newValues = [];
      // Download shapefiles in sequence rather than asynchronously.
      return country_codes.reduce(function(memo, value) {
        return memo.then(function() {
          // Download and then process shape file.
          return download_shapefile_then_process(value);
        }).then(function(newValue) {
          newValues.push(newValue);
        });
      }, Promise.resolve(null)).then(function() {
        console.log('done!')
        return newValues;
      });
    });
  });
});

/**
 * Unzips shapefile, creates geojson version, and uploads it to blob
 * TODO Destroy local file on upload complete
 * @param{String} country_code - 3 letter country ISO code
 * @return{Promise} Fulfilled with result of azure upload
 */
function process_zip(country_code){
  return new Promise(function(resolve){
    azure.upload_blob(container_name, country_code, zips_dir, 'zip')
    .then(function(){
      geo.unzip_and_geojson(country_code, zips_dir).then(function(){
        resolve();
      });
    });
  });
}

/**
 * Downloads shape file.
 * @param{String} country_code - 3 letter country ISO code
 * @return{Promise} Fulfilled with result of azure upload
 */
function download_shapefile_then_process(country_code){
  return new Promise(function(resolve){
    var url = shapefiles_url + country_code + '_adm_shp.zip';
    var output = zips_dir + '/' + country_code + '.zip';
    console.log('Downloading', country_code);
    request({url: url, encoding: null}, function(err, resp, body) {
      console.log(resp.statusCode);
      if ( resp.statusCode != 200) { console.log('NOGO!'); resolve(); }
      if (err) throw err;
      fs.writeFile(output, body, function(err) {
        if (err) throw err;
        console.log('File saved.');
        process_zip(country_code).then(function(){
          setTimeout(function(){console.log('wait...'); resolve();}, 2000);
        });
      });
    });
  });
}
