var ArgumentParser = require('argparse').ArgumentParser;
var azure_storage = require('azure-storage');
var config = require('./config');
var bluebird = require('bluebird');
var fs = require('fs');

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-k', '--kind'],
  {help: 'Kind of json: geojson or topojson'}
);
parser.addArgument(
  ['-d', '--json_dir'],
  {help: 'Name of container with json to import'}
);
var args = parser.parseArgs();
var kind = args.kind;

var azure_key = config[kind].azure.key1;
var storage_account = config[kind].azure.storage_account;
var blobSvc = azure_storage.createBlobService(storage_account, azure_key);

var json_src = args.json_dir;
var json_dir = './data/' + kind + '/' + json_src;
var files = fs.readdirSync(json_dir);

bluebird.map(files, function(file, i) {
  return upload_blob(file, i);
}, {concurrency: 1}).catch(function(err) {console.log(err);})
.then(() => {
  console.log('Done!');
  process.exit();
});

function upload_blob(file, i) {
  console.log(i, file);
  return new Promise(function(resolve, reject) {
    blobSvc.createBlockBlobFromLocalFile(json_src, file, json_dir + '/' + file, function(err){
      if (err) {
        return reject(err);
      } else{
        resolve();
      }
    });
  });
}
