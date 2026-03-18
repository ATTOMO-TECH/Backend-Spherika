require("dotenv").config();
const axios = require("axios");

const SHOP_NAME = process.env.SHOP_NAME;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const updateCustomerTag = async (customerId, tag) => {
  const endpoint = `https://${SHOP_NAME}/admin/api/2023-04/customers/${customerId}.json`;

  try {
    const getResponse = await axios.get(endpoint, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN
      }
    });

    let existingTags = getResponse.data.customer.tags;
    existingTags = existingTags ? existingTags.split(",") : [];

    if (!existingTags.includes(tag)) {
      existingTags.push(tag);
    }

    const payload = {
      customer: {
        id: customerId,
        tags: existingTags.join(",")
      }
    };

    const response = await axios.put(endpoint, payload, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN
      }
    });

    return response.data.customer;
  } catch (error) {
    console.error("Error actualizando la etiqueta del cliente:", error.message);
    return null;
  }
};

module.exports = {
  updateCustomerTag
};
