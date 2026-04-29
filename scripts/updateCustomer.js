require("dotenv").config();
const axios = require("axios");
const { getAccessToken } = require("../config/shopifyAuth");

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP || process.env.SHOPIFY_SHOP;

const getHeaders = async () => {
  const token = await getAccessToken();

  return {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
  };
};

const getMetafieldId = async (customerId, namespace, key) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  try {
    const response = await axios.get(endpoint, {
      headers: await getHeaders(),
    });

    const metafields = response.data.metafields;

    console.log("Fetched metafields for customer", customerId, ":", metafields);

    for (const metafield of metafields) {
      if (metafield.namespace === namespace && metafield.key === key) {
        return metafield.id;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching metafields:", error.message);
    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }
    return null;
  }
};

const createCustomerMetafield = async (
  customerId,
  namespace,
  key,
  newValue,
) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  const stringValue = newValue.toString();

  const payload = {
    metafield: {
      namespace,
      key,
      value: stringValue,
      value_type: "string",
    },
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: await getHeaders(),
    });

    return response.data.metafield;
  } catch (error) {
    console.error("Error creating metafield:", error.message);

    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }

    return null;
  }
};

const updateCustomerMetafield = async (customerId, metafieldId, value) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields/${metafieldId}.json`;

  console.log(`Value to be sent: ${value.toString()}`);
  console.log(`Updating metafield with ID ${metafieldId} to value: ${value}`);

  try {
    const response = await axios.put(
      endpoint,
      {
        metafield: {
          id: metafieldId,
          value: value.toString(),
        },
      },
      {
        headers: await getHeaders(),
      },
    );

    console.log("Shopify response:", response.data);
    return response.data.metafield;
  } catch (error) {
    console.error("Error updating metafield:", error.message);

    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }

    return null;
  }
};

const updateCustomerMetafieldBoolean = async (customerId, key, newValue) => {
  try {
    newValue = String(newValue).toLowerCase();
    const namespace = "custom";

    console.log(`[Script] Buscando ID para: ${namespace}.${key}`);
    const metafieldId = await getMetafieldId(customerId, namespace, key);

    if (metafieldId) {
      console.log(`[Script] ID encontrado (${metafieldId}). Enviando PUT...`);
      return await updateCustomerMetafield(customerId, metafieldId, newValue);
    } else {
      console.log(`[Script] No existe. Enviando POST para crear...`);
      const newMetafield = await createCustomerMetafield(
        customerId,
        namespace,
        key,
        newValue
      );
      return newMetafield;
    }
  } catch (err) {
    console.error("[Script] Error fatal en lógica de metacampos:", err.message);
    throw err; // Re-lanzamos para que el server.js lo capture
  }
};

const createBirthdayMetafieldForCustomer = async (customerId, birthday) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  const data = {
    metafield: {
      namespace: "facts",
      key: "birth_date",
      value: birthday,
      type: "date",
    },
  };

  try {
    const response = await axios.post(endpoint, data, {
      headers: await getHeaders(),
    });

    console.log(
      `Metafield created for customer ${customerId} with birthday: ${birthday}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Error creating birthday metafield for customer ${customerId}:`,
      error.message,
    );

    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }

    return null;
  }
};

module.exports = {
  createCustomerMetafield,
  updateCustomerMetafieldBoolean,
  createBirthdayMetafieldForCustomer,
};
