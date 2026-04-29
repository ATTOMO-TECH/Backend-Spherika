const express = require("express");
const cors = require("cors");
const axios = require("axios");
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

const { updateCustomerTag } = require("./scripts/updateB2BTag");
const { sendMail } = require("./scripts/sendMail");
const { PORT } = require("./config/config");

const app = express();

// --- CONFIGURACIÓN DE CORS ---
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

// --- MIDDLEWARES (Orden Crítico) ---
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Estos dos deben ir ANTES de las rutas para que req.body no sea undefined
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger para ver qué llega a Railway
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- RUTAS ---

// 1. Ruta principal que te está dando problemas
app.post("/update-metafield", async (req, res) => {
  try {
    console.log("--- INICIO UPDATE-METAFIELD ---");
    console.log("Body completo recibido:", JSON.stringify(req.body));

    const { customerId, metafields } = req.body;

    if (!customerId || !metafields) {
      console.error("❌ Error: Faltan datos obligatorios (customerId o metafields)");
      return res.status(400).json({
        error: "Missing customerId or metafields",
        received: req.body
      });
    }

    let errors = [];
    const entries = Object.entries(metafields);
    console.log(`Procesando ${entries.length} metacampos para el cliente ${customerId}...`);

    for (const [key, value] of entries) {
      try {
        console.log(`Actualizando clave [${key}] con valor: ${value}`);
        // Forzamos el valor a boolean si viene como string "true"/"false"
        const boolValue = (value === "true" || value === true);

        const result = await updateCustomerMetafieldBoolean(
          customerId,
          key,
          boolValue
        );

        if (!result) {
          console.error(`⚠️ No se pudo actualizar la clave: ${key}`);
          errors.push(`Error updating metafield: ${key}`);
        } else {
          console.log(`✅ Éxito en clave: ${key}`);
        }
      } catch (error) {
        console.error(`❌ Excepción en clave [${key}]:`, error.message);
        errors.push(`Excepción en ${key}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.error("--- FINALIZADO CON ERRORES ---", errors);
      return res.status(500).json({ success: false, errors });
    } else {
      console.log("--- FINALIZADO CON ÉXITO: REDIRECCIONANDO ---");
      // Redirigimos al usuario de vuelta a su cuenta en Shopify
      return res.redirect("https://caviarspherika.com/account");
    }
  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN /UPDATE-METAFIELD:", error);
    return res.status(500).send("Internal Server Error: " + error.message);
  }
});

// Manejador para evitar errores 502/404 si alguien entra por URL directa (GET)
app.get("/update-metafield", (req, res) => {
  console.log("⚠️ Intento de GET en ruta POST. Redirigiendo...");
  res.redirect("https://caviarspherika.com/account");
});

// 2. Otras rutas de Clientes
app.get("/customers", async (req, res) => {
  try {
    const customers = await getCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).send("Error retrieving customers.");
  }
});

app.get("/customer/:id", async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    customer ? res.json(customer) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    res.status(500).send("Error processing request.");
  }
});

app.get("/customer-metafields/:customerId", async (req, res) => {
  try {
    const metafields = await getCustomerMetafields(req.params.customerId);
    metafields ? res.json(metafields) : res.status(404).send("Not found");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. B2B y Birthday
app.post("/customer-birthday", async (req, res) => {
  try {
    const { id, note } = req.body;
    const birthdayNote = (note || "").match(/cumpleaños: ([0-9-]+)/);
    const birthday = birthdayNote ? birthdayNote[1] : null;
    const metafield = await createBirthdayMetafieldForCustomer(id, birthday);
    res.status(200).json(metafield);
  } catch (error) {
    res.status(500).send("Error processing birthday.");
  }
});

app.post("/update-b2b-tag", async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).send("Falta customerId");
    const result = await updateCustomerTag(customerId, "B2B");
    res.status(result ? 200 : 500).json({ success: !!result });
  } catch (error) {
    res.status(500).send("Error B2B.");
  }
});

// 4. Validación VAT (VIES)
const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

app.post("/api/vat/validate", async (req, res) => {
  try {
    const { vat } = req.body;
    if (!vat) return res.status(400).json({ error: "VAT requerido" });

    const match = vat.trim().toUpperCase().match(/^([A-Z]{2})([0-9A-Z]+)$/);
    if (!match) return res.json({ valid: false, reason: "Formato inválido" });

    const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:ec.europa.eu:taxud:vies:services:checkVat:types"><soap:Body><tns:checkVat><tns:countryCode>${match[1]}</tns:countryCode><tns:vatNumber>${match[2]}</tns:vatNumber></tns:checkVat></soap:Body></soap:Envelope>`;

    const { data } = await axios.post(VIES_URL, xml, { headers: { "Content-Type": "text/xml" } });
    const parser = new Parser({ explicitArray: true, tagNameProcessors: [processors.stripPrefix] });
    const result = await parser.parseStringPromise(data);

    const responseBody = result.Envelope.Body[0].checkVatResponse[0];
    res.json({
      success: true,
      valid: responseBody.valid[0] === "true",
      name: (responseBody.name[0] || "").trim(),
      address: (responseBody.address[0] || "").trim()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/mail/sendMail", sendMail);

// --- INICIO ---
app.listen(PORT, () => {
  console.log(`✅ Servidor Spherika activo en puerto: ${PORT}`);
});