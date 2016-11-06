var elasticsearch = require('es');
var _ = require('underscore');
var es = elasticsearch();
var fs = require('fs');
var geojson_src = 'gadm2-8';
var geojson_dir = './data/' + geojson_src;
var jsonfile = require('jsonfile');
var files = fs.readdirSync(geojson_dir);
var flag = 1;
var bluebird = require('bluebird');

bluebird.map(files, function(file, i) {
  console.log(file, i);
  return import_admins(file, i);
}, {concurrency: 1})
.catch(function(err) {console.log(err);})
.then(function() {console.log('Done with import of admins.');});

function import_admins(file) {
  return new Promise(function(resolve, reject){
    var json = jsonfile.readFileSync(geojson_dir + '/' + file);
    var admin_level = file.match(/\d/)[0];
    bulk_es_insert(json.features, admin_level, file)
    .catch(function(err) { return reject(err);})
    .then(function() {resolve();});
  });
}

function bulk_es_insert(records, admin_level) {
  return new Promise(function(resolve, reject) {
    require('bluebird').map(records, function(record, i) {
      console.log(i, record.properties.ISO, admin_level);
      return import_admin(record, admin_level);
    }, {concurrency: 1})
    .catch(function(err) {return reject(err);})
    .then(function() {resolve();});
  });
}

function import_admin(record, admin_level) {
  record.properties.admin_level = admin_level;
  record.properties.pub_src = geojson_src;
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
