var tz = require('./timezone');

exports.add_admin_id = function(src, admin, admin_level, country_iso) {
  admin.properties.ISO = country_iso;
  admin.properties.admin_level = admin_level;
  admin.properties.pub_src = src;
  if (src.match('santiblanko')) {
    admin.properties.ID_0 = 0;
    admin.properties.ID_1 = admin.properties.DPTO;
    admin.properties.ID_2 = admin.properties.WCOLGEN02_;
  }
  admin.admin_id = country_iso_
  [ID_0, ID_1, ID_2].forEach(function(e) {
    if (admin.properties[e]) {
      admin_id = admin_id + '_' + e;
    }
  });
  admin.timezone = tz.add_timezone(admin);
  return admin;
};
