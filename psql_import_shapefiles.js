// node import_admins_elasticsearch.js -d santiblanko
// nohup node  import_shapefiles_postgres.js -d gadmm2-8> nohup1.out 2>&1&
var config = require('./config');
var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var bluebird = require('bluebird');
var fileExists = require('file-exists');
var exec = require('child_process').exec;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-d', '--geojson_dir'],
  {help: 'Name of container with geojson to import'}
);

var args = parser.parseArgs();
var geojson_src = args.geojson_dir;
var geojson_dir = config.temp_storage + geojson_src;
var files = fs.readdirSync(geojson_dir);
var isos = Object.keys(
  files.reduce(
  function(h,e) {
    var iso = e.match(/^[A-Z]{3}/)[0];
    h[iso] = 1;
    return h;},
  {})
);

var wanted_files = files.reduce(function(h, file) {
  var iso = file.match(/^[A-Z]{3}/)[0];
  var level = file.match(/\d/)[0];
  if (h[iso]) {
    if (level > h[iso]) {
      h[iso] = level;
    }
  } else {
    h[iso] = level;
  }
  return h;
}, {});

// azure.create_storage_container(geojson_src)
// .catch(console.log)
// .then(function(){
  bluebird.each(Object.keys(wanted_files), function(country, i) {
    console.log(country, wanted_files[country]);
    return import_admins(country, wanted_files[country]);
  }, {concurrency: 1})
  .catch(console.log)
  .then(function() {
    console.log('Done with import of admins.');
    process.exit();
  });

function import_admins(country, admin_level) {
  return new Promise((resolve, reject) => {
    var command = 'bash util/create_db.sh ' + country.toLowerCase() + ' ' + admin_level + ' ' + geojson_src;
    console.log(command)
    // resolve();
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);

        return reject(err);
      }
      resolve();
      console.log(stdout);
    });
  });
}
