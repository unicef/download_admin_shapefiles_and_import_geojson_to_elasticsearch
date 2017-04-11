var async = require('async');
var bluebird = require('bluebird');
var geojsonArea = require('@mapbox/geojson-area');
var pg = require('pg');
var fs = require('fs');
var tif_source = 'world_pop';
var exec = require('child_process').exec;

var command = "psql -l -t | cut -d'|' -f1 ";
// var command = "psql -lqt  | grep _";
var config = require('./config').pg_config;
function country_db_names() {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      resolve(stdout.split(/\n/)
      .map(e => { return e.replace(/\s+/g, '');})
      .filter(e => { return !!e && e.match(/^[a-z]{3}$/);}));
    });
  });
}
country_db_names().then(countries => {
  bluebird.each(countries.slice(108), country => {
    console.log(country, '!!!');
    return process_country(country).then(() => {
      // Drop raster from table if exists
      drop_raster_table(country, 'pop');
    });
  }, {concurrency: 1})
  .then(process.exit);
});

function tiff_file_name(content) {
  var ary = content.split(/\//);
  return ary[ary.length-1].replace(/.tif\n/g, '');
}

function process_country(country) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      function(callback) {
        var command = 'bash ./util/fetch_and_process_raster.sh ' + country;
        exec(command,{maxBuffer: 4096 * 2500}, (err, stdout, stderr) => {
          console.log(stdout, '|', stderr);
          var tif_file = tiff_file_name(stdout);
          if (err) {
            console.error(err);
            callback();
            return;
          }
          if (tif_file.length < 4) {
            var command = 'rm -rf ./data/rasters/' + country + '*';
            exec(command,{maxBuffer: 2048 * 1500}, (err, stdout, stderr) => {
              resolve();
            });
          } else {
            callback(null, tif_file);
          }
        });
      },
      // Get names of admin tables (admin_0, admin_1, admin_2) in country database
      function(tif_file, callback) {
        var results = [];
        console.log('About to query...');
        var connectionString = 'postgres://localhost:5432/' + country;
        config.database = country;
        pg.connect(config, (err, client, done) => {
          var st = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
          var query = client.query(st);
          // Stream results back one row at a time
          query.on('row', (row) => {
            results.push(row);
          });
          // After all data is returned, close connection and return results
          query.on('end', () => {
            // Keep a index of admin levels

            var admin_tables = results.filter(r => { return r.table_name.match('admin');});
            bluebird.each(admin_tables, (admin_table) => {
              return scan_raster(country, admin_table, connectionString, tif_file);
            })
            .then(callback);
          });
        });
      }
    ], function() {
      resolve();
    });
  });
}

function scan_raster(country, admin_table, connectionString, tif_file) {
  return new Promise((resolve, reject) => {
    var admin_level = parseInt(admin_table.table_name.match(/\d/)[0]);
    var results = [];
    config.database = country;
    pg.connect(config, (err, client, done) => {
      var st = 'SELECT gid, ST_Area(geom::geography)/1609.34^2 AS kilometers, ';
      for(var i = 0; i <= admin_level; i++) {
        st += '"' + admin_table.table_name + '"' + '.ID_' + i + ', ';
      }

      st += 'SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum) FROM "' +
      admin_table.table_name +
      '" LEFT JOIN pop ON ST_Intersects("' + admin_table.table_name +
      '".geom, pop.rast) GROUP BY gid;';
      var query = client.query(st);

      // Stream results back one row at a time
      query.on('row', (row) => {
        console.log(row);
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        // content = content + results.map(r => {return [file, r.sum || 0, r.dpto, r.wcolgen02_, 'col_0_' + r.dpto + '_' + r.wcolgen02_ + '_santiblanko'].join(" ") }).join("\n")
        // Get population for whole country to store in file name
        var pop_sum = parseInt(results.reduce((s, r) => { return s + r.sum }, 0)); 
        var kilo_sum = parseInt(results.reduce((s, r) => { return s + r.kilometers}, 0));
        fs.writeFile('./data/rasters/processed/' +
        country + '^' + admin_table.table_name.replace(/^admin/, country) +
        '^' + tif_file +
        '^' + tif_source +
        '^' + pop_sum +
        '^' + kilo_sum +
        '.json',
        JSON.stringify(results), (err) => {
          if (err) console.log(err)
          console.log('done!', country, admin_table)
          exec('rm -r ./data/rasters/' + country, function (err, stdout, stderr) {
            exec('rm -r ./data/rasters/' + country + '.zip', function (err, stdout, stderr) {
              done();
              resolve();
            });
          });
        });
      });
    });
  })
}

function list_connections() {
  return new Promise((resolve, reject) => {
    
  })
}

function drop_raster_table(country, kind) {
  var command = 'bash ./util/drop_raster_table.sh ' + country + ' ' + kind
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      console.log(stdout)
      if (err) {
        console.error(err);
        resolve();
      }
      resolve()
    });
  });
}

