// Imports highest granularity of admin per country to a single psql database.
// node psql_import_shapefiles.js -d shapefiles
var config = require('./config');
var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var bluebird = require('bluebird');
var exec = require('child_process').exec;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-d', '--shapefiles_dir'],
  {help: 'Name of container with shapefiles to import'}
);

var args = parser.parseArgs();
var shapefiles_dir = config.temp_storage + args.shapefiles_dir;
var shapefile_directories = fs.readdirSync(shapefiles_dir);

var wanted_files = shapefile_directories.reduce(
  (h, e) => {
    var iso = e.match(/^[A-Z]{3}/);
    if (iso) {
      iso = iso[0];
      h[iso] = fs.readdirSync(shapefiles_dir + '/' + iso).filter( f => {
        return f.match('shp$');
      }).sort((a, b) => {
        var first = a.match(/\d/)[0];
        var second = b.match(/\d/)[0];
        return second - first;
      })[0]
    }
    return h;},
  {})

  bluebird.each(Object.keys(wanted_files), function(country, i) {
    // return console.log(country, wanted_files[country]);
    return import_admins(country, wanted_files[country]);
  }, {concurrency: 1})
  .catch(console.log)
  .then(function() {
    console.log('Done with import of admins.');
    process.exit();
  });

function import_admins(country, file) {
  return new Promise((resolve, reject) => {
    var admin_level = file.match(/\d/)[0];
    var country = file.match(/[A-Z]{3}/)[0];
    console.log(country, admin_level, country,  '!!!!')

    var command = 'bash util/create_db.sh ' +
    'all_countries' +
    ' ' +
    country.toLowerCase() +
    '_' +
    admin_level +
    '_gadm2-8 ' +
    shapefiles_dir + '/' + country + '/' + file;
    console.log(command)
    // //var command = 'bash destroy_db.sh ' + country.toLowerCase() + ' ' + admin_level + ' ' + geojson_src;
    // resolve();
    exec(command,{maxBuffer: 2048 * 2500}, (err, stdout, stderr) => {
      if (err) {
        console.error(err);

        return reject(err);
      }
      resolve();
      console.log(stdout);
    });
  });
}
