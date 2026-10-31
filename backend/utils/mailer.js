const nodemailer = require('nodemailer');
const { config } = require('../config/env');

let transporter;

// Created on first use so it picks up credentials loaded from AWS Secrets Manager.
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.emailUser, pass: config.emailPass },
    });
  }
  return transporter;
};

const sendMail = (options) => getTransporter().sendMail({ from: config.emailUser, ...options });

// Absolute link into the React app, e.g. clientLink('/reset-password', { token })
const clientLink = (path, query = {}) => {
  // Relative path keeps any sub-path in CLIENT_URL (e.g. https://example.com/app)
  const url = new URL(path.replace(/^\//, ''), `${config.clientUrl}/`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

module.exports = { sendMail, clientLink };
