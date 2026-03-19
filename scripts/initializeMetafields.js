require("dotenv").config();
const axios = require("axios");
const { getAccessToken } = require("./shopifyAuth");
const token = await getAccessToken();

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const META_FIELDS = ["compra", "ocasi_n", "nacionalidad", "consumidor"];
const NAMESPACE = "custom";

const getCustomerMetafields = async (customerId) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });
    return response.data.metafields || [];
  } catch (error) {
    console.error("Error fetching metafields:", error.message);
    return [];
  }
};

const createOrUpdateMetafield = async (customerId, metafieldKey) => {
  const existingMetafields = await getCustomerMetafields(customerId);

  const existingMetafield = existingMetafields.find(
    (metafield) =>
      metafield.namespace === NAMESPACE && metafield.key === metafieldKey,
  );

  if (existingMetafield) {
    if (existingMetafield.value === "true") {
      // No sobrescribimos si ya es true
      console.log(
        `Metafield ${metafieldKey} for customer ${customerId} is already true. Skipping.`,
      );
    } else {
      // Si el valor existente no es "true", lo actualizamos a "false"
      console.log(
        `Metafield ${metafieldKey} for customer ${customerId} has a value of ${existingMetafield.value}. Updating to false.`,
      );
      await updateCustomerMetafield(customerId, existingMetafield.id, "false");
    }
  } else {
    // Si no existe, lo creamos
    const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;
    const payload = {
      metafield: {
        namespace: NAMESPACE,
        key: metafieldKey,
        value: "false",
        value_type: "string",
      },
    };

    try {
      await axios.post(endpoint, payload, {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      });
      console.log(
        `Metafield ${metafieldKey} for customer ${customerId} created with value false.`,
      );
    } catch (error) {
      console.error(
        `Error creating metafield ${metafieldKey} for customer ${customerId}:`,
        error.message,
      );
    }
  }
};

const initializeMetafieldsForCustomer = async (customerId) => {
  for (let metafieldKey of META_FIELDS) {
    await createOrUpdateMetafield(customerId, metafieldKey);
  }
};

// No olvides importar la función updateCustomerMetafield desde el archivo correcto.
const { updateCustomerMetafield } = require("./updateCustomer");

// Aquí puedes invocar initializeMetafieldsForCustomer con el ID del cliente que deseas inicializar.
// initializeMetafieldsForCustomer("YOUR_CUSTOMER_ID_HERE");
