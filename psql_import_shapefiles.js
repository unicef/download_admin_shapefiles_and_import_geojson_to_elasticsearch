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
  function(h,e) { var iso = e.match(/^[A-Z]{3}/)[0]; h[iso] = 1; return h;},
  {})
);

var needed_zeros = certain_admin_if_no_other(isos, [1, 2]);
//var needed_ones = certain_admin_if_no_other(isos, [0, 2]);
var wanted_files = files.filter(function(file) {
  var iso = file.match(/^[A-Z]{3}/)[0];
  var level = file.match(/\d/)[0];
  return (level == 2 || level == 1 || needed_zeros[iso]);
});

// azure.create_storage_container(geojson_src)
// .catch(console.log)
// .then(function(){
  bluebird.each(wanted_files, function(file, i) {
    console.log(file, i);
    return import_admins(file, i);
  }, {concurrency: 1})
  .catch(console.log)
  .then(function() {
    console.log('Done with import of admins.');
    process.exit();
  });

function import_admins(file, i) {
  var country_admin = file.split(/[\._]/g);
  var country = country_admin[0].toLowerCase();
  var admin_level = country_admin[1];
  return new Promise((resolve, reject) => {
    var command = 'bash create_db.sh ' + country + ' ' + admin_level;
    // console.log(command)
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

function certain_admin_if_no_other(isos, ary_num) {
  var solo_certain_admin_isos = {};
  isos.forEach(function(iso) {
    var good = 1;
    ary_num.forEach(function(pre) {
      if (fileExists(geojson_dir + '/' + iso + '_' + pre + '.json')) {
        good = 0;
      }
    });
    if (good) {
      solo_certain_admin_isos[iso] = 1;
    }
  });
  return solo_certain_admin_isos;
}
