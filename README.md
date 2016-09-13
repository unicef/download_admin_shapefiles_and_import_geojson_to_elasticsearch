# Get shapefiles for all countries, store geojson in azure blob
- Downloads [gadm]( http://gadm.org) zipped shapefiles for each country from [biogeo.ucdavis.edu](http://biogeo.ucdavis.edu)
- Unzips them
- Creates geojson files
- Uploads zipped shapefiles and geojson to azure blob storage containers

### Convert shapefile to geojson
Requires the [GDAL - Geospatial Data Abstraction Library](http://www.gdal.org/)

- (On Mac OSX: brew install gdal)
- [Ubuntu](http://www.sarasafavi.com/installing-gdalogr-on-ubuntu.html)
