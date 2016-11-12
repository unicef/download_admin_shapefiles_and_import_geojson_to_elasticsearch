// node import_admins_elasticsearch.js -d santiblanko
// nohup node  import_admins_elasticsearch.js -d gadm2-8> nohup1.out 2>&1&
var azure = require('./lib/azure');
var elasticsearch = require('es');
var ArgumentParser = require('argparse').ArgumentParser;
var normalize_admin = require('./lib/add_admin_indexes');
var es = elasticsearch();
var fs = require('fs');
var jsonfile = require('jsonfile');
var flag = 1;
var bluebird = require('bluebird');
var fileExists = require('file-exists');

var ON_DEATH = require('death'); //this is intentionally ugly

ON_DEATH(function(signal, err) {
  console.log(signal);
  console.log(err);
});

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
var geojson_dir = './data/' + geojson_src;
var files = fs.readdirSync(geojson_dir);

var isos = Object.keys(
  files.reduce(
  function(h,e) { var iso = e.match(/^[A-Z]{3}/)[0]; h[iso] = 1; return h;},
  {})
);

var needed_zeros = zero_only_if_no_1_2(isos);

var wanted_files = files.filter(function(file) {
  var iso = file.match(/^[A-Z]{3}/)[0];
  var level = file.match(/\d/)[0];
  return (level != 0 || needed_zeros[iso]);
});

azure.create_storage_container(geojson_src)
.catch(function(err) {console.log(err);})
.then(function(){
  bluebird.map(wanted_files, function(file, i) {
    console.log(file, i);
    return import_admins(file, i);
  }, {concurrency: 1})
  .catch(function(err) {console.log(err);})
  .then(function() {console.log('Done with import of admins.');});
});

function import_admins(file) {
  return new Promise(function(resolve, reject){
    var json = jsonfile.readFileSync(geojson_dir + '/' + file);
    var country_iso = file.match(/^[A-Z]{3}/)[0];
    var admin_level = file.match(/\d/)[0];
    bulk_es_insert(json.features, admin_level, country_iso, file)
    .catch(function(err) { return reject(err);})
    .then(function() {resolve();});
  });
}

function bulk_es_insert(records, admin_level, country_iso) {
  return new Promise(function(resolve, reject) {
    require('bluebird').map(records, function(record, i) {
      record = normalize_admin.add_admin_indexes(geojson_src, record, admin_level, country_iso);
      console.log(i, record.properties.ISO, admin_level);
      return import_admin(record, admin_level);
    }, {concurrency: 1})
    .catch(function(err) {return reject(err);})
    .then(function() {resolve();});
  });
}

function zero_only_if_no_1_2(isos) {
  var solo_zero_admin_isos = {};
  isos.forEach(function(iso) {
    var good = 1;
    ['_1', '_2'].forEach(function(pre) {
      if (fileExists(geojson_dir + '/' + iso + pre + '.geojson')) {
        good = 0;
      }
    });
    if (good) {
      solo_zero_admin_isos[iso] = 1;
    }
  });
  return solo_zero_admin_isos;
}

function import_admin(record, admin_level) {
  return new Promise(function(resolve, reject) {
    var options = {
      _index: 'admins',
      _type: 'admin'
    };

    if(flag === 1) {
      es.index(options, record, function(err) {
        if (err) {
          console.log(err);
          // return reject(err);
        }
        setTimeout(function(){resolve();}, 300);
      });

    } else {
      resolve();
    }
  });
}
