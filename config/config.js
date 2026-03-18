require('dotenv').config();

const CONFIG = {
    API_KEY: process.env.SHOP_API_KEY,
    API_SECRET: process.env.SHOP_API_SECRET,
    ACCESS_TOKEN: process.env.ACCESS_TOKEN,
    SHOP_NAME: process.env.SHOP_NAME, // remplaza 'tu-nombre-de-tienda' con el nombre real de tu tienda.
};

module.exports = CONFIG;
