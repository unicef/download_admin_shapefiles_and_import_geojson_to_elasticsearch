var azure = require('./lib/azure');
var elasticsearch = require('es');
var ArgumentParser = require('argparse').ArgumentParser;
var enhance = require('./lib/add_admin_ids')
var es = elasticsearch();
var fs = require('fs');

var jsonfile = require('jsonfile');
var flag = 1;
var bluebird = require('bluebird');

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

azure.create_storage_container(geojson_src)
.catch(function(err) {console.log(err);})
.then(function(){
  bluebird.map(files, function(file, i) {
    console.log(file, i);
    return import_admins(file, i);
  }, {concurrency: 1})
  .catch(function(err) {console.log(err);})
  .then(function() {console.log('Done with import of admins.');});
})

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
      record = enhance.add_admin_ids(geojson_src, record, admin_level, country_iso);
      console.log(i, record.properties.ISO, admin_level);
      return import_admin(record, admin_level);
    }, {concurrency: 1})
    .catch(function(err) {return reject(err);})
    .then(function() {resolve();});
  });
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
