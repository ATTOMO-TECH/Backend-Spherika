require("dotenv").config(); // Cargar las variables de entorno desde el archivo .env
const axios = require("axios");
const { getAccessToken } = require("./shopifyAuth");
const token = await getAccessToken();
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;

// 1. Función para obtener el ID del Metafield:
const getMetafieldId = async (customerId, namespace, key) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields.json`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    const metafields = response.data.metafields;

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

// Función para actualizar un Metafield específico:
const updateCustomerMetafield = async (customerId, metafieldId, value) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}/metafields/${metafieldId}.json`;

  try {
    const response = await axios.put(
      endpoint,
      {
        metafield: {
          id: metafieldId,
          value: value.toString(), // Convertir el valor a una cadena, ya que es un booleano
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.metafield;
  } catch (error) {
    console.error("Error updating metafield:", error.message);
    return null;
  }
};

// Función combinada para actualizar un Metafield booleano basado en el namespace y key:
const updateCustomerMetafieldBoolean = async (customerId, key, newValue) => {
  const namespace = "custom";

  const metafieldId = await getMetafieldId(customerId, namespace, key);

  if (metafieldId) {
    return await updateCustomerMetafield(customerId, metafieldId, newValue);
  } else {
    console.error(`Metafield ${key} not found.`);
    return null;
  }
};

// Función para obtener cambiar el Nombre y Apellido de un cliente:
const updateCustomerName = async (customerId, firstName, lastName) => {
  const endpoint = `https://${SHOPIFY_SHOP}/admin/api/2023-07/customers/${customerId}.json`;

  try {
    const response = await axios.put(
      endpoint,
      {
        customer: {
          id: customerId,
          first_name: firstName,
          last_name: lastName,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.customer;
  } catch (error) {
    console.error("Error updating customer name:", error.message);
    return null;
  }
};

// Tomar los argumentos desde la línea de comandos:
const customerId = process.argv[2];
const metafieldKey = process.argv[3]; // El key del metacampo a actualizar
const newValue = process.argv[4] === "true"; // Valor para el metacampo
const firstName = process.argv[5]; // Nuevo nombre (opcional)
const lastName = process.argv[6]; // Nuevo apellido (opcional)

// Ejecuta la función para actualizar el metacampo:
updateCustomerMetafieldBoolean(customerId, metafieldKey, newValue)
  .then((result) => {
    if (result) {
      console.log(`Metafield ${metafieldKey} updated successfully:`, result);
    }
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });

// Si se proporcionan nombre y apellido, ejecuta la función para actualizarlos:
if (firstName && lastName) {
  updateCustomerName(customerId, firstName, lastName)
    .then((result) => {
      if (result) {
        console.log("Customer name updated successfully:", result);
      }
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
}
