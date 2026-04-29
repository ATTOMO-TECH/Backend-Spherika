const express = require("express");
const cors = require("cors");
const axios = require("axios"); // 👈 AÑADIDO
const xml2js = require("xml2js");
const { Parser, processors } = xml2js;
const {
  getCustomers,
  getCustomerById,
  getCustomerMetafields,
} = require("./scripts/getCustomers");
const {
  updateCustomerMetafieldBoolean,
  createBirthdayMetafieldForCustomer,
} = require("./scripts/updateCustomer");

// Importa la lógica para actualizar la etiqueta B2B
const { updateCustomerTag } = require("./scripts/updateB2BTag");
const { sendMail } = require("./scripts/sendMail");

const app = express();
const { PORT } = require("./config/config");

// --- MIDDLEWARE ---
const allowedOrigins = [
  /^https?:\/\/([a-z0-9-]+\.)*caviarspherika\.com$/i,
  /^https?:\/\/([a-z0-9-]+\.)*myshopify\.com$/i,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((re) => re.test(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded
app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.url}`);
  next();
});
// ------------------

// --- RUTAS DE CLIENTES Y METAFIELES ---
app.get("/customers", async (req, res) => {
  try {
    const customers = await getCustomers();
    res.json(customers);
  } catch (error) {
    console.error("Error retrieving customers:", error);
    res.status(500).send("Error retrieving customers.");
  }
});

app.get("/customer/:id", async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await getCustomerById(customerId);
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: "Customer not found" });
    }
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    res.status(500).send("Error processing request.");
  }
});

app.get("/customer-metafields/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const metafields = await getCustomerMetafields(customerId);
    if (metafields) {
      res.json(metafields);
    } else {
      res
        .status(404)
        .json({ error: "Metafields not found for the given customer ID." });
    }
  } catch (error) {
    console.error("Error getting customer metafields:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/update-metafield", async (req, res) => {
  try {
    const { customerId, metafields } = req.body;

    console.log("Received metafields[recetas]:", req.body.metafields?.recetas);

    if (!customerId || !metafields) {
      return res
        .status(400)
        .send("Missing customerId or metafields in request.");
    }

    let errors = [];
    for (const [key, value] of Object.entries(metafields)) {
      try {
        const result = await updateCustomerMetafieldBoolean(
          customerId,
          key,
          value === "true",
        );
        if (!result) {
          errors.push(`Error updating metafield with key: ${key}.`);
        }
      } catch (error) {
        errors.push(
          `Error processing request for metafield with key: ${key}. Error: ${error.message}`,
        );
      }
    }

    if (errors.length > 0) {
      res.status(500).send({ errors });
    } else {
      res.redirect("https://caviarspherika.com/account");
    }
  } catch (error) {
    console.error("Error updating metafield:", error);
    res.status(500).send("Error processing request.");
  }
});

app.post("/customer-birthday", async (req, res) => {
  const customerData = req.body; // Datos del cliente enviados por Shopify
  const notes = customerData.note || ""; // Acceder a la nota del cliente
  let birthday;

  // Extraer la fecha de cumpleaños de las notas si existe
  const birthdayNote = notes.match(/cumpleaños: ([0-9-]+)/); // Ajusta la regex según tu formato
  if (birthdayNote) {
    birthday = birthdayNote[1]; // Obtener la fecha de cumpleaños de la nota
  }

  try {
    const metafield = await createBirthdayMetafieldForCustomer(
      customerData.id,
      birthday,
    );
    res.status(200).json(metafield);
  } catch (error) {
    console.error("Error creating birthday metafield:", error);
    res.status(500).send("Error processing request.");
  }
});

// Nueva ruta para actualizar la etiqueta B2B
app.post("/update-b2b-tag", async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).send("Falta el customerId.");
    }

    // Usamos la función para actualizar la etiqueta B2B del cliente
    const result = await updateCustomerTag(customerId, "B2B");

    if (result) {
      res.status(200).json({
        success: true,
        message: "Etiqueta B2B actualizada correctamente.",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error al actualizar la etiqueta B2B.",
      });
    }
  } catch (error) {
    console.error("Error al actualizar la etiqueta B2B:", error.message);
    res.status(500).send("Error procesando la solicitud.");
  }
});

// --- RUTA VAT / VIES ---
const VIES_URL =
  "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

app.post("/api/vat/validate", async (req, res) => {
  console.log("Body recibido:", req.body);
  try {
    const { vat } = req.body;

    if (!vat || typeof vat !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "VAT requerido en el body." });
    }

    const raw = vat.trim().toUpperCase();
    const match = raw.match(/^([A-Z]{2})([0-9A-Z]+)$/);
    if (!match) {
      return res.json({
        success: true,
        valid: false,
        reason:
          "Formato incorrecto. Debe empezar por código de país, ej. ES, FR, DE.",
      });
    }

    const countryCode = match[1];
    const vatNumber = match[2];

    const xml = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soap:Body>
          <tns:checkVat>
            <tns:countryCode>${countryCode}</tns:countryCode>
            <tns:vatNumber>${vatNumber}</tns:vatNumber>
          </tns:checkVat>
        </soap:Body>
      </soap:Envelope>
    `.trim();

    const { data } = await axios.post(VIES_URL, xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        // axios ya pone Content-Length solo, realmente no hace falta
      },
      timeout: 15000,
    });

    console.log("VIES XML Response (Raw):", data);

    // Parser que quita prefijos (soap:, ns2:, tns:, etc.)
    const parser = new Parser({
      explicitArray: true,
      tagNameProcessors: [processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(data);
    console.log("XML2JS Parsed Object:", JSON.stringify(result, null, 2));

    // Ahora las claves serán: Envelope -> Body -> checkVatResponse
    const envelope = result.Envelope;
    if (!envelope || !envelope.Body) {
      throw new Error("Respuesta SOAP inesperada (sin Envelope/Body)");
    }

    const body = envelope.Body[0];

    // Manejo de posibles errores SOAP (Fault)
    if (body.Fault) {
      console.error("SOAP Fault:", JSON.stringify(body.Fault, null, 2));
      return res.status(500).json({
        success: false,
        error: "Error SOAP devuelto por VIES.",
      });
    }

    const responseBody = body.checkVatResponse?.[0];
    if (!responseBody) {
      throw new Error("checkVatResponse no encontrado en la respuesta.");
    }

    const valid = responseBody.valid?.[0] === "true";
    const name = (responseBody.name?.[0] || "").trim();
    const address = (responseBody.address?.[0] || "").trim();

    console.log(`Resultado final extraído: Valid=${valid}, Name=${name}`);

    return res.json({
      success: true,
      valid,
      name,
      address,
    });
  } catch (error) {
    console.error(
      "Error al procesar VAT (posible error de parseo o VIES):",
      error?.message || error,
    );
    return res.status(500).json({
      success: false,
      error: "Error al procesar la respuesta o fallo de conexión con VIES.",
    });
  }
});
app.post("/mail/sendMail", sendMail);

// -----------------------------

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
