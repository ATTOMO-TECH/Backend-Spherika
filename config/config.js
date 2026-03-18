require("dotenv").config();

module.exports = {
  SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET,
  SHOPIFY_SHOP: process.env.SHOPIFY_SHOP,
  PORT: process.env.PORT || 3000,
};
