const axios = require('axios');

const serviceToken = process.env.SERVICE_AUTH_SECRET;
if (serviceToken) {
  axios.defaults.headers.common['X-Service-Token'] = serviceToken;
}

module.exports = axios;
