require("dotenv").config();
const axios = require("axios");
const { getAccessToken } = require("../config/shopifyAuth");
const { SHOPIFY_SHOP } = require("../config/config");

const API_VERSION = "2023-07";

async function getHeaders() {
  const token = await getAccessToken();
  return {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
  };
}

const updateCustomerTag = async (customerId, tag) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/${API_VERSION}/customers/${customerId}.json`;

  try {
    const getResponse = await axios.get(endpoint, {
      headers: await getHeaders(),
    });

    let existingTags = getResponse.data.customer.tags;
    existingTags = existingTags
      ? existingTags.split(",").map((t) => t.trim())
      : [];

    if (!existingTags.includes(tag)) {
      existingTags.push(tag);
    }

    const payload = {
      customer: {
        id: customerId,
        tags: existingTags.join(", "),
      },
    };

    const response = await axios.put(endpoint, payload, {
      headers: await getHeaders(),
    });

    return response.data.customer;
  } catch (error) {
    console.error("Error actualizando la etiqueta del cliente:", error.message);
    return null;
  }
};

module.exports = { updateCustomerTag };
