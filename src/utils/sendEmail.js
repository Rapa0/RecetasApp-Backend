const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  const msg = {
    to: options.email,
    from: process.env.FROM_EMAIL, //
    subject: options.subject,
    text: options.message,

  };

  try {
    await sgMail.send(msg);
    console.log(`Correo enviado exitosamente a ${options.email}`);
  } catch (error) {
    console.error('Error al enviar el correo con SendGrid:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error('No se pudo enviar el email de verificación.');
  }
};

module.exports = sendEmail;