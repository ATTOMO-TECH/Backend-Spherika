const axios = require("axios");
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const { getAccessToken } = require("./shopifyAuth");
const token = await getAccessToken();
const BASE_URL = process.env.BASE_URL;

const getCustomers = async () => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers.json`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (response.data && response.data.customers) {
      return response.data.customers;
    } else {
      console.error("No customer data returned");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving customers:", error.message);
    return null;
  }
};

async function getCustomerById(customerId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/customers/${customerId}.json?metafield`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data && response.data.customer) {
      return response.data.customer;
    } else {
      console.error("No customer data returned");
      return null;
    }
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
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data && response.data.metafields) {
      return response.data.metafields;
    } else {
      console.error("No metafields data returned for the customer");
      return null;
    }
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
  getCustomerMetafields, // Exporta la nueva función
};
