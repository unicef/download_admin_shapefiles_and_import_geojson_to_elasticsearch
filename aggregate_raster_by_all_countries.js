// node aggregate_raster_by_all_countries.js --tif aegypti_simon_hay
var async = require('async');
var bluebird = require('bluebird');
var pg = require('pg');
var fs = require('fs');
var ArgumentParser = require('argparse').ArgumentParser;
var exec = require('child_process').exec;
var command = 'psql all_countries -c "\\dt" ';
var config = require('./config').pg_config;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-t', '--tif'],
  {help: 'Name of tif to import'}
);
parser.addArgument(
  ['-s', '--source'],
  {help: 'Source of tif to import'}
);

var args = parser.parseArgs();
var tif = args.tif;
var tif_source = args.source;

function execute_command(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      resolve(stdout);
    });
  });
}

// Get list of country for which exists a table in all_countries db.
function country_db_names() {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      resolve(
        stdout.split(/\n/)
        .map(e => { return e.replace(/\s+/g, '');})
        .map(e => {
          return e.split('|')[1];
        })
        .filter(e => {
          return !!e && e.match(/[a-z]{3}_\d/);
        })
      );
    });
  });
}

async.waterfall([
  function(callback) {
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = 'psql all_countries -c "DROP TABLE IF EXISTS pop"';
    execute_command(command)
    .then(response => {
      console.log('adsd')
      console.log(response);
      callback();
    });
  },

  function(callback) {
    console.log('About to add ', tif)
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = "raster2pgsql -Y -s 4326 -t 100x100 -I data/mosquitos/" + tif + ".tif pop | psql all_countries";
    execute_command(command)
    .then(response => {
      console.log(response);
      callback();
    });
  },

  function(callback) {
    country_db_names()
    .then(admin_source_tables => {
      bluebird.each(admin_source_tables, t => {
        [country, admin_level, shp_source] = t.split(/_/);
        return scan_raster(country, admin_level, shp_source);
      }, {concurrency: 1})
      .then(() => {
        callback();
      });
    });
  },
  function(callback) {
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = 'psql all_countries -c "DROP TABLE IF EXISTS pop"'
    execute_command(command)
    .then(response => {
      console.log(response);
      callback();
    });
  }
], function() {
  console.log('done!');
  process.exit()
});

function scan_raster(country, admin_level, shp_source) {
  var table = [country, admin_level, shp_source].join('_');

  var results = [];
  console.log('About to query...');

  return new Promise((resolve, reject) => {
    pg.connect(config, (err, client, done) => {

      var st = 'SELECT gid, ST_Area(geom::geography)/1609.34^2 AS kilometers,';
      for(var i = 0; i <= admin_level; i++) {
        st += '"' + table + '"' + '.ID_' + i + ', ';
      }

      st += 'SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum) FROM "' +
      table +
      '" LEFT JOIN pop ON ST_Intersects("' + table +
      '".geom, pop.rast) GROUP BY gid;';
      var query = client.query(st);
      console.log(st)
      // Stream results back one row at a time
      query.on('row', (row) => {
        console.log(row);
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        console.log(country, results);
        // content = content + results.map(r => {return [file, r.sum || 0, r.dpto, r.wcolgen02_, 'col_0_' + r.dpto + '_' + r.wcolgen02_ + '_santiblanko'].join(" ") }).join("\n")
        fs.writeFile('./data/mosquitos/processed/' +
        country + '^' + table +
        '^' + tif +
        '^' + tif_source +
        '.json',
        JSON.stringify(results), (err) => {
          if (err) console.log(err)
          console.log('done!', country, table)
          done();
          resolve();
        });
      });
    });
  })
}
