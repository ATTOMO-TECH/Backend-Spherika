const axios = require("axios");
const { getAccessToken } = require("../config/shopifyAuth");
const { SHOPIFY_SHOP } = require("../config/config");

const API_VERSION = "2023-07";
const BASE_URL = `https://${SHOPIFY_SHOP}/admin/api/${API_VERSION}`;

async function getHeaders() {
  const token = await getAccessToken();
  return {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
  };
}

const getCustomers = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/customers.json`, {
      headers: await getHeaders(),
    });

    return response.data?.customers || null;
  } catch (error) {
    console.error("Error retrieving customers:", error.message);
    return null;
  }
};

async function getCustomerById(customerId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/customers/${customerId}.json`,
      {
        headers: await getHeaders(),
      },
    );

    return response.data?.customer || null;
  } catch (error) {
    console.error(
      `Error fetching customer with ID ${customerId}:`,
      error.message,
    );
    return null;
  }
}

async function getCustomerMetafields(customerId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/customers/${customerId}/metafields.json`,
      {
        headers: await getHeaders(),
      },
    );

    return response.data?.metafields || null;
  } catch (error) {
    console.error(
      `Error fetching metafields for customer with ID ${customerId}:`,
      error.message,
    );
    return null;
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerMetafields,
};
