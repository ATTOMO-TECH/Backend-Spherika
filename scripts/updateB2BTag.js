require("dotenv").config();
const axios = require("axios");
const { getAccessToken } = require("./shopifyAuth");
const token = await getAccessToken();
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;

const updateCustomerTag = async (customerId, tag) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-04/customers/${customerId}.json`;

  try {
    const getResponse = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    let existingTags = getResponse.data.customer.tags;
    existingTags = existingTags ? existingTags.split(",") : [];

    if (!existingTags.includes(tag)) {
      existingTags.push(tag);
    }

    const payload = {
      customer: {
        id: customerId,
        tags: existingTags.join(","),
      },
    };

    const response = await axios.put(endpoint, payload, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    return response.data.customer;
  } catch (error) {
    console.error("Error actualizando la etiqueta del cliente:", error.message);
    return null;
  }
};

module.exports = {
  updateCustomerTag,
};
