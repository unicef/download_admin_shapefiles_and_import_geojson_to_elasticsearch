var ArgumentParser = require('argparse').ArgumentParser;
var azure_storage = require('azure-storage');
var config = require('../config');
var bluebird = require('bluebird');
var fs = require('fs');

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-k', '--kind'],
  {help: 'Kind of blob: population or geojson...'}
);

parser.addArgument(
  ['-d', '--geojson_dir'],
  {help: 'Name of container with geojson to import'}
);
var args = parser.parseArgs();
var kind = args.kind;
var local_path = config[kind].local_path;
var files = fs.readdirSync(local_path).filter((f) => {return f.match(/json/);});

var storage_account = config[kind].azure.storage_account;
var azure_key = config[kind].azure.key1;

var blobSvc = azure_storage.createBlobService(storage_account, azure_key);

bluebird.map(files, function(file, i) {
  return upload_blob(file, i);
}, {concurrency: 1}).catch(function(err) {console.log(err);})
.then(() => {
  console.log('Done!');
  process.exit();
});

function upload_blob(file, i) {
  console.log(i, file);
  return new Promise((resolve, reject) => {
    console.log(local_path + file);

    blobSvc.createBlockBlobFromLocalFile('population', file, local_path + file,  function(err){
      if (err) {
        return reject(err);
      } else{
        resolve();
      }
    });
  });
}
