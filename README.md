# Get shapefiles for all countries, store geojson in azure blob

- Downloads [gadm]( http://gadm.org) zipped shapefiles for each country from [biogeo.ucdavis.edu](http://biogeo.ucdavis.edu)
- Unzips them
- Creates geojson files
- Uploads zipped shapefiles and geojson to azure blob storage containers

    node app.js
    node import_admins_elasticsearch.js -d santiblanko
    nohup node  import_admins_elasticsearch.js -d gadm2-8> nohup1.out 2>&1&

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

 node  import_admins_elasticsearch.js -d gadm2-8
