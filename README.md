# Get shapefiles for all countries, store geojson in azure blob
- This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)
- Downloads [gadm]( http://gadm.org) zipped shapefiles for each country from [biogeo.ucdavis.edu](http://biogeo.ucdavis.edu)
- Unzips them
- Creates geojson files
- Uploads zipped shapefiles and geojson to azure blob storage containers

    node app.js

### Convert shapefile to geojson
Requires the [GDAL - Geospatial Data Abstraction Library](http://www.gdal.org/)

- (On Mac OSX: brew install gdal)
- [Ubuntu](http://www.sarasafavi.com/installing-gdalogr-on-ubuntu.html)

### Import admins to elasticsearch
curl -XDELETE localhost:9200/admins

curl -XPOST localhost:9200/admins -d '{
  mappings: {
    admin: {
      properties: {
        geometry: {
          type: "geo_shape"
        }
      }
    }
  }
}'


### Import admins to ElasticSearch (For aggegating mobility by airport to admin)
nohup node import_admins_elasticsearch.js -d gadm2-8> nohup1.out 2>&1&

// To import a different admin set, add new directory with geojson in data directory then:
node import_admins_elasticsearch.js -d <name of directory> ([santiblanko](https://github.com/santiblanko/colombia.geojson), for instance)
