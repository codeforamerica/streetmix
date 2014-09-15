module.exports = {
  app_host_port: 'streetmix-staging.herokuapp.com',
  header_host_port: 'streetmix-staging.herokuapp.com',
  restapi_baseuri: 'http://streetmix-staging.herokuapp.com/api',
  restapi: {
    baseuri: 'http://streetmix-staging.herokuapp.com/api'
  },
  facebook_app_id: '175861739245183',
  email: {
    feedback_recipient: process.env.EMAIL_FEEDBACK_RECIPIENT || "streetmix@codeforamerica.org",
    feedback_subject: "Streetmix feedback",
    feedback_sender_default: "noreply@codeforamerica.org"
  }
}
