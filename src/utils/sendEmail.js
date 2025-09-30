const nodemailer = require('nodemailer');

const sendEmail = async (options) => {

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS,
    },
  });

 
  const mailOptions = {
    from: 'RecetasApp <no-reply@recetasapp.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };


  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito:', info.response);
  } catch (error) {
    console.error('Error al enviar el correo:', error);

    throw new Error('No se pudo enviar el email de verificación.');
  }
};

module.exports = sendEmail;