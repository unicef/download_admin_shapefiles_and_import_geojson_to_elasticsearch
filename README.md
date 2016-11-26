# Get shapefiles for all countries, store geojson in azure blob
- This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)
- Requires the [GDAL - Geospatial Data Abstraction Library](http://www.gdal.org/) to convert shapefile to geojson
    - (On Mac OSX: brew install gdal)
    - [Ubuntu](http://www.sarasafavi.com/installing-gdalogr-on-ubuntu.html)

### What it does
- Downloads [gadm]( http://gadm.org) zipped shapefiles for each country from [biogeo.ucdavis.edu](http://biogeo.ucdavis.edu)
- Unzips them
- Creates geojson files
- Uploads zipped shapefiles and geojson to azure blob storage containers

##### Run
    node app.js


#### Import admins to ElasticSearch (For aggegating mobility by airport to admin)
- ElasticSearch must be installed
`curl -XDELETE localhost:9200/admins`

`curl -XPOST localhost:9200/admins -d '{
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
`
##### Run
    nohup node import_admins_elasticsearch.js -d gadm2-8> nohup1.out 2>&1&

- To import a different admin set, add new directory with geojson in data directory
    node import_admins_elasticsearch.js -d <name of directory>
[santiblanko](https://github.com/santiblanko/colombia.geojson), for instance


##### Admin meta info

###### Unique ID:
  - GADM 0 features: ID_0
  - GADM 1 features: ID_0, ID_1.
  - GADM 2, also has ID_0, ID_1, ID_2.
  - For unique id : country_ISO-ID_0-ID_1-ID_2-admin_name.downcased

###### Shapefile sources:
- [GADM 2.8](http://biogeo.ucdavis.edu/data/gadm2.8/shp/)
- Colombia: [github](http://github.com/santiblanko/colombia.geojson)
  - ogr2ogr -f GeoJSON -t_srs crs:84 COL_2.geojson mpio.shp
  - Decided to replace GADM Colombia admins 1&2 with depto.shp(1) and mpio.shp(2)
    - ID_0: 53 (from GADM Colombia ID_0)
    - ID_1: properties.DPTO
    - ID_2: properties.WCOLGEN02_
