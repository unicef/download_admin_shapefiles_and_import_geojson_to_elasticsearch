exports.add_admin_ids = function(src, admin, admin_level, country_iso) {
  admin.properties.ISO = country_iso;
  admin.properties.admin_level = admin_level;
  admin.properties.pub_src = src;
  if (src.match('santiblanko')) {
    admin.properties.ID_0 = 53;
    admin.properties.ID_1 = admin.properties.DPTO;
    admin.properties.ID_2 = admin.properties.WCOLGEN02_;
  }
  return admin;
};
