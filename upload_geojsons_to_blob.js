var ArgumentParser = require('argparse').ArgumentParser;
var azure_storage = require('azure-storage');
var config = require('./config');
var azure_key = config.geojson.azure.key1;
var storage_account = config.geojson.azure.storage_account;
var blobSvc = azure_storage.createBlobService(storage_account, azure_key);
var bluebird = require('bluebird');
var fs = require('fs');

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

bluebird.map(files, function(file, i) {
  return upload_blob(file, i);
}, {concurrency: 1}).catch(function(err) {console.log(err);})
.then(() => {
  console.log('Done!');
  process.exit();
})

function upload_blob(file, i) {
  console.log(i, file);
  return new Promise(function(resolve, reject) {
    blobSvc.createBlockBlobFromLocalFile(geojson_src, file, geojson_dir + '/' + file, function(err){
      if (err) {
        return reject(err);
      } else{
        resolve();
      }
    });
  });
}
