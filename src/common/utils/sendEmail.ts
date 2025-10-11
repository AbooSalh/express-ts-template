import nodemailer from "nodemailer";
import logger from "@/common/utils/logger";
import env from "@/common/config/env.config";

const sendEmail = async (options: nodemailer.SendMailOptions) => {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  } as nodemailer.TransportOptions);

  try {
    await transport.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo, // Forward the replyTo field
    });

    logger.info("Email sent successfully", {
      to: options.to,
      subject: options.subject,
    });
  } catch (error) {
    logger.error("Email sending failed", {
      error,
      to: options.to,
      subject: options.subject,
    });
    throw new Error("Failed to send email. Please try again later.");
  }
};

export default sendEmail;
