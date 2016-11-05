var azure = require('azure-storage');
var config = require('../config');
var azure_key = config.azure.key1;
var storage_account = config.azure.storage_account;
var blobSvc = azure.createBlobService(storage_account, azure_key);

/**
 * Creates storage container
 * Ignores countries already in container.
 * @param{String} container_name - Name of blob container
 * @return{Promise} Fulfilled - with result of container created
 */
exports.create_storage_container = function(collection_name) {
  return new Promise(function(resolve) {
    blobSvc.createContainerIfNotExists(collection_name, {
    }, function(error, result) {
      // logger.log.container_created(collection_name, result || error);
      if (!error) {
        resolve(result); // if result = false, container already existed.
        return;
      }
    });
  });
};

/**
 * Gets list of countries needed to fetch.
 * Ignores countries already in container.
 * @return{Promise} Fulfilled list of countries to get shapefiles for
 */
exports.get_list_of_countries_to_fetch = function(container_name, country_codes){
  return new Promise(function(resolve){
    get_blobs_list(container_name).then(function(list) {
      resolve(
        country_codes.filter(function(e){
          return list.indexOf(e) === -1;
        })
      );
    });
  });
};

/**
 * Gets list of geojson blobs
 * Just in case we want to only process files that we don't already have
 * @param{String} container_name - Name of blob container
 * @return{Promise} Fulfilled list of blobs
 */
function get_blobs_list(container_name) {
  return new Promise(function(resolve) {
    blobSvc.listBlobsSegmented(container_name, null, function(err, result) {
      if (!err) {
        resolve(
          result.entries.map(entry => entry.name.split('_')[0]));
      } else {
        // logger.log('error', {error: err});
      }
    });
  });
}

/**
 * Uploads data file as blob.
 * TODO Destroy local file on upload complete
 * @param{String} col - Collection name
 * @param{String} filename - Name of file
 * @param{String} local_path - Path to file
 * @return{Promise} Fulfilled with result of azure upload
 */
exports.upload_blob = function(col, filename, local_dir, kind) {
  console.log('Begin store to blob:', col, filename);
  return new Promise(function(resolve, reject) {
    blobSvc.createBlockBlobFromLocalFile(
      col,
      filename + '.' + kind,
      local_dir + '/' + filename + '.' + kind,
      function(err, result) {
        if(err) {
          console.log(err);
          return reject(err);
        }

        // logger.log.file_uploaded_to_blob(col, filename, err);
        // TODO: Destroy local file.
        if (!err) {
          console.log('Upload to blob complete', filename);
          resolve(result);
        }
      });
  });
};
