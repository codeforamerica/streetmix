const axios = require('axios')
const qs = require('qs')
const btoa = require('btoa')
const config = require('config')
const logger = require('../../../../lib/logger.js')()

const { User } = require('../../../db/models')
const passport = require('passport')
const OAuth2Strategy = require('passport-oauth2').Strategy

if (!process.env.COIL_CLIENT_ID || !process.env.COIL_CLIENT_SECRET) {
  console.error('DEFINE ENV VARS PLEASE!')
}

function getBtp(oauthTokenResponse, res) {
  const accessToken = oauthTokenResponse.data.access_token
  axios
    .post('https://api.coil.com/user/btp', '', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Bearer ' + accessToken
      }
    })
    .then(function (btpResponse) {
      console.log(btpResponse)

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.json(btpResponse.data)
    })
    .catch(function (error) {
      console.error(error)
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.json(error.message)
    })
}

function handler(req, res) {
  const encodedAuth = Buffer.from(
    process.env.COIL_CLIENT_ID +
      ':' +
      encodeURIComponent(process.env.COIL_CLIENT_SECRET)
  ).toString('base64')

  axios
    .post(
      'https://coil.com/oauth/token',
      qs.stringify({
        grant_type: 'authorization_code',
        redirect_uri: `${config.restapi.protocol}${config.app_host_port}/services/integrations/coil/callback`,
        code: req.query.code
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + encodedAuth
        }
      }
    )
    .then(function (oauthTokenResponse) {
      console.log(oauthTokenResponse.data)
      getBtp(oauthTokenResponse, res)
    })
    .catch(function (error) {
      console.error(error)
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.json(error.message)
    })
}

/**
 finds the database record for the given user
 */
const findUser = async function (userId) {
  const user = await User.findByPk(userId)
  if (user === null) {
    return 'user not found'
  }
  return user.dataValues
}

const initCoil = () => {
  passport.use(
    'coil',
    new OAuth2Strategy(
      {
        authorizationURL: 'https://coil.com/oauth/auth',
        tokenURL: 'https://coil.com/oauth/token',
        clientID: process.env.COIL_CLIENT_ID,
        clientSecret: process.env.COIL_CLIENT_SECRET,
        scope: 'simple_wm openid',
        callbackURL: `${config.restapi.protocol}${config.app_host_port}/services/integrations/coil/callback`,
        passReqToCallback: true,
        customHeaders: {
          authorization: `Basic ${btoa(
            encodeURIComponent(process.env.COIL_CLIENT_ID) +
              ':' +
              encodeURIComponent(process.env.COIL_CLIENT_SECRET)
          )}`
        }
      },
      async function (req, accessToken, refreshToken, profile, done) {
        const databaseUser = await findUser(req.query.state)
        // passing the profile data along the request, probably another way to do this
        req.profile = profile
        return done(null, databaseUser)
      }
    )
  )
  // these aren't used yet, but would be if we start using persistent user sessions
  passport.serializeUser(function (user, done) {
    done(null, user)
  })

  passport.deserializeUser(function (id, done) {
    const user = async () => {
      await User.findByPk(id)
    }
    done(null, user)
  })
}

// Only initialize Patreon auth strategy if the env vars are set.
if (process.env.COIL_CLIENT_ID && process.env.COIL_CLIENT_SECRET) {
  initCoil()
}

exports.get = (req, res, next) => {
  if (!process.env.COIL_CLIENT_ID || !process.env.COIL_CLIENT_SECRET) {
    res.status(500).json({ status: 500, msg: 'Coil integration unavailable.' })
  }

  /*
    at this point,the request has user info from auth0 that we passed to this route
    auth0 nickname == user.id in our internal db that we'll need later for lookup

    this might not be available if the user isn't signed in
      we could add error handiling for this, but also they _should_ only ever be
      getting here from a button that you only see when you're signed in..
    */
  passport.authenticate('coil', {
    state: req.user.nickname,
    failureRedirect: '/error'
  })(req, res, next)
}

exports.callback = (req, res, next) => {
  if (!process.env.COIL_CLIENT_ID || !process.env.COIL_CLIENT_SECRET) {
    res.status(500).json({ status: 500, msg: 'Coil integration unavailable.' })
  }
  handler(req, res)
}

/**
 * connects the third party profile with the database user record
 * pass third party profile data here, construct an object to save to user DB
 */
exports.connectUser = async (req, res) => {
  // in passport, using 'authenticate' attaches user data to 'account'
  // instead of overriding the user session data
  const databaseUser = req.account
  const identity = {
    provider: req.profile.provider,
    user_id: req.profile.id
  }
  try {
    await User.update(
      {
        identities: [identity]
      },
      { where: { id: databaseUser.id }, returning: true }
    )
    res.redirect('/')
  } catch (err) {
    // what would we want to do here?
    logger.error(err)
    res.redirect('/error')
  }
}
