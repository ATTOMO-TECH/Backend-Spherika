const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Simplificamos la configuración para Gmail
  auth: {
    user: process.env.SMTP_USER, // Tu correo: spherikaformularios@gmail.com
    pass: process.env.SMTP_PASS, // Tu "Contraseña de Aplicación" de Google
  },
});

const sendMail = async (req, res) => {
  const { nombre, email, telefono, mensaje } = req.body;

  const mailOptions = {
    // IMPORTANTE: El 'from' debe ser el mismo que el 'user' del SMTP para evitar spam.
    from: process.env.SMTP_USER,
    to: "info@caviarspherika.com",
    cc: "spherikaformularios@gmail.com",
    replyTo: email, // Esto permite que al dar "Responder", le escribas al cliente
    subject: `Nuevo mensaje de contacto: ${nombre}`,
    text: `
      Has recibido un nuevo mensaje:
      Nombre: ${nombre}
      Email: ${email}
      Teléfono: ${telefono}
      Mensaje: ${mensaje}
    `,
    html: `
      <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #333;">Nuevo contacto desde la web</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p style="margin-top: 15px;"><strong>Mensaje:</strong></p>
        <div style="background: #f9f9f9; padding: 10px; border-left: 4px solid #ccc;">
          ${mensaje}
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Correo enviado con éxito:", info.messageId);

    res
      .status(200)
      .json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("❌ Error en el envío:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { sendMail };
