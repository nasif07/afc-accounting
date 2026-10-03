// Single source of truth for the email pattern used across Mongoose schemas
// and controllers, previously copy-pasted in 6 places.
const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const isValidEmail = (email) => EMAIL_REGEX.test(email);

module.exports = { EMAIL_REGEX, isValidEmail };
