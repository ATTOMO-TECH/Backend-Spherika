require("dotenv").config();
const axios = require("axios");

const SHOP_NAME = process.env.SHOP_NAME;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const getMetafieldId = async (customerId, namespace, key) => {
  const endpoint = `https://${SHOP_NAME}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });
    const metafields = response.data.metafields;

    console.log("Fetched metafields for customer", customerId, ":", metafields);

    for (let metafield of metafields) {
      if (metafield.namespace === namespace && metafield.key === key) {
        return metafield.id;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching metafields:", error.message);
    return null;
  }
};

const createCustomerMetafield = async (
  customerId,
  namespace,
  key,
  newValue
) => {
  const endpoint = `https://${SHOP_NAME}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  // Convertir el valor booleano a string
  const stringValue = newValue.toString();

  const payload = {
    metafield: {
      namespace: namespace,
      key: key,
      value: stringValue,
      value_type: "string",
    },
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    return response.data.metafield;
  } catch (error) {
    console.error("Error creating metafield:", error.message);

    // Registro de detalles adicionales de error de Shopify
    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }

    return null;
  }
};

/* const updateCustomerMetafield = async (customerId, metafieldId, value) => {
    const endpoint = `https://${SHOP_NAME}/admin/api/2023-07/customers/${customerId}/metafields/${metafieldId}.json`;

    console.log(`Updating metafield with ID ${metafieldId} to value: ${value}`);

    try {
        const response = await axios.put(endpoint, {
            metafield: {
                id: metafieldId,
                value: value.toString()
            }
        }, {
            headers: {
                'X-Shopify-Access-Token': ACCESS_TOKEN
            }
        });
        
        console.log("Shopify response:", response.data);
        return response.data.metafield;
    } catch (error) {
        console.error('Error updating metafield:', error.message);
        
        // Registro adicional del error si hay más detalles disponibles
        if (error.response && error.response.data) {
            console.error('Error details:', error.response.data);
        }
        
        return null;
    }
}; */

const updateCustomerMetafield = async (customerId, metafieldId, value) => {
  const endpoint = `https://${SHOP_NAME}/admin/api/2023-07/customers/${customerId}/metafields/${metafieldId}.json`;

  // Punto 1: Imprime el valor que se enviará
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
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    console.log("Shopify response:", response.data);
    return response.data.metafield;
  } catch (error) {
    console.error("Error updating metafield:", error.message);

    // Punto 2: Registro adicional del error si hay más detalles disponibles
    if (error.response && error.response.data) {
      console.error("Shopify error details:", error.response.data);
    }

    return null;
  }
};

const updateCustomerMetafieldBoolean = async (customerId, key, newValue) => {
  newValue = String(newValue).toLowerCase(); // Convierte cualquier valor a cadena en minúsculas
  const namespace = "custom";

  // Logs para verificar los valores recibidos
  console.log(
    `Received data: Customer ID - ${customerId}, Key - ${key}, New Value - ${newValue}`
  );

  console.log(
    `Fetching metafield ID for customer ${customerId} with key ${key}`
  );
  const metafieldId = await getMetafieldId(customerId, namespace, key);

  console.log(`Received metafield ID: ${metafieldId}`);
  // Si encontramos el ID del metafield, lo actualizamos
  if (metafieldId) {
    console.log(`Updating metafield ${key} with new value: ${newValue}`);
    return await updateCustomerMetafield(customerId, metafieldId, newValue);
  } else {
    console.error(`Metafield ${key} not found. Creating a new one.`);

    // Si no encontramos el metafield, intentamos crear uno nuevo
    const newMetafield = await createCustomerMetafield(
      customerId,
      namespace,
      key,
      newValue
    );

    if (newMetafield) {
      console.log(`Metafield ${key} created successfully.`);
      return newMetafield;
    } else {
      console.error(`Error creating the metafield ${key}.`);
      return null;
    }
  }
};

const createBirthdayMetafieldForCustomer = async (customerId, birthday) => {
  const endpoint = `https://${SHOP_NAME}/admin/api/2023-07/customers/${customerId}/metafields.json`;
  const headers = {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
  };
  const data = {
    metafield: {
      namespace: "facts",
      key: "birth_date",
      value: birthday,
      type: "date",
    },
  };

  try {
    const response = await axios.post(endpoint, data, { headers });
    console.log(
      `Metafield created for customer ${customerId} with birthday: ${birthday}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error creating birthday metafield for customer ${customerId}:`,
      error.message
    );
    return null;
  }
};

// Exportando la función para ser usada en otros archivos
module.exports = {
  createCustomerMetafield,
  updateCustomerMetafieldBoolean,
  createBirthdayMetafieldForCustomer,
};
