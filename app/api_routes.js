const routes = require('express').Router()
const bodyParser = require('body-parser')
const cors = require('cors')
const resources = require('./resources')
const jwtCheck = require('./authentication')
const { BTPTokenCheck } = require('./resources/services/integrations/coil')
/**
 * @swagger
 *
 * definitions:
 *   UserData:
 *     type: object
 *     properties:
 *       lastStreetId:
 *         type: string
 *         format: uuid
 *       lastStreetNamespacedId:
 *         type: integer
 *       lastStreetCreatorId:
 *         type: string
 *       saveAsImageTransparentSky:
 *         type: boolean
 *       saveAsImageSegmentNamesAndWidths:
 *         type: boolean
 *       saveAsImageStreetName:
 *         type: boolean
 *       newStreetPreference:
 *         type: integer
 *   User:
 *     type: object
 *     properties:
 *       id:
 *         type: string
 *       data:
 *         $ref: '#/definitions/UserData'
 *       createdAt:
 *         type: string
 *         format: date-time
 *       updatedAt:
 *        type: string
 *        format: date-time
 *       profileImageUrl:
 *         type: string
 *         example: "https://pbs.twimg.com/profile_images/461825032621027328/j8-0jPD5_normal.png"
 *       roles:
 *         type: array
 *         items:
 *           type: string
 *           example: "USER"
 *   Language:
 *     type: object
 *     properties:
 *       code:
 *         type: string
 *         example: "en"
 *       name:
 *         type: string
 *         example: "English"
 *       native:
 *         type: string
 *         example: "English"
 *   GeolocationResponse:
 *     type: object
 *     properties:
 *       ip:
 *         type: string
 *       type:
 *         type: string
 *         example: "ipv4"
 *       continent_code:
 *         type: string
 *         example: "NA"
 *       continent_name:
 *         type: string
 *         example: "North America"
 *       country_code:
 *         type: string
 *         example: "US"
 *       country_name:
 *         type: string
 *         example: "United States"
 *       region_code:
 *         type: string
 *         example: "NY"
 *       region_name:
 *         type: string
 *         example: "New York"
 *       city:
 *         type: string
 *         example: "Astoria"
 *       zip:
 *         type: string
 *         example: "11106"
 *       latitude:
 *         type: number
 *         format: float
 *       longitude:
 *         type: number
 *         format: float
 *       location:
 *         type: object
 *         properties:
 *           geoname_id:
 *             type: integer
 *             example: 5107464
 *           capital:
 *             type: string
 *             example: "Washington D.C."
 *           languages:
 *             type: array
 *             items:
 *               $ref: '#/definitions/Language'
 *   StreetImageData:
 *     type: object
 *     properties:
 *       public_id:
 *         type: string
 *       width:
 *         type: integer
 *       height:
 *         type: integer
 *       format:
 *         type: string
 *       secure_url:
 *         type: string
 *       created_at:
 *         type: string
 *         format: date-time
 *   Segment:
 *     type: object
 *     required:
 *       - type
 *       - width
 *       - variantString
 *     properties:
 *       id:
 *         type: string
 *         format: nanoid
 *       type:
 *         type: string
 *       variantString:
 *         type: string
 *       width:
 *         type: integer
 *   StreetData:
 *     type: object
 *     properties:
 *       street:
 *         type: object
 *         properties:
 *           schemaVersion:
 *             type: integer
 *           width:
 *             type: integer
 *           id:
 *             type: string
 *             format: uuid
 *           units:
 *             type: number
 *           location:
 *             type: object
 *           userUpdated:
 *             type: boolean
 *           environment:
 *             type: string
 *           leftBuildingHeight:
 *             type: string
 *           rightBuildingHeight:
 *             type: string
 *           segments:
 *             type: array
 *             items:
 *               $ref: '#/definitions/Segment'
 *           editCount:
 *             type: integer
 *   NewStreetImage:
 *     $ref: '#/definitions/StreetImageData'
 *   NewStreet:
 *     type: object
 *     required:
 *       - data
 *       - password
 *     properties:
 *       name:
 *         type: string
 *       data:
 *         $ref: '#/definitions/StreetData'
 *   Street:
 *     type: object
 *     required:
 *       - id
 *     properties:
 *       id:
 *         type: string
 *         format: uuid
 *       namespacedId:
 *         type: integer
 *         format: int64
 *       status:
 *         type: string
 *         example: "ACTIVE"
 *       name:
 *         type: string
 *       creatorId:
 *         type: string
 *       creatorIp:
 *         type: string
 *       data:
 *         $ref: '#/definitions/StreetData'
 *       createdAt:
 *         type: string
 *         format: date-time
 *       updatedAt:
 *         type: string
 *         format: date-time
 *         description: Server-side updates will update this timestamp. This is the canonical timestamp for the street and should be used for display purposes.
 *       clientUpdatedAt:
 *         type: string
 *         format: date-time
 *         description: Client-side updates will update this timestamp. This should only be used to verify the age of client side data.
 *   Flags:
 *     type: object
 *     example:
 *       SEGMENT_CONSTRUCTION:
 *         label: "Segment — construction items"
 *         defaultValue: false
 *     properties:
 *       flagId:
 *         type: object
 *         $ref: '#/definitions/FlagItem'
 *   FlagItem:
 *     type: object
 *     properties:
 *       label:
 *         type: string
 *         description: "Label for this flag in the UI"
 *         example: "Segment — construction items"
 *       defaultValue:
 *         type: boolean
 *         description: "Default value for this flag"
 *         example: "false"
 *       enabled:
 *         type: boolean
 *         description: "Whether editing the state of this flag is allowed (optional property, defaults to true)"
 *         example: "true"
 */

// Enable CORS for all OPTIONs "pre-flight" requests
routes.options('/api/*', cors())

// API: all users

/**
 * @swagger
 *
 * /api/v1/users:
 *   post:
 *     description: Creates a user
 *     tags:
 *       - users
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: user
 *         description: User object
 *         in: body
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/User'
 *     responses:
 *       200:
 *         description: Streets
 *         schema:
 *           $ref: '#/definitions/User'
 */
routes.post('/api/v1/users', cors(), jwtCheck, resources.v1.users.post)

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     description: Returns users
 *     parameters:
 *       - in: params
 *         name: userId
 *         schema:
 *           type: string
 *           required: true
 *     tags:
 *       - users
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: User
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/User'
 */
routes.get('/api/v1/users', cors(), jwtCheck, resources.v1.users.get)

// API: single user

/**
 * @swagger
 * /api/v1/users/{user_id}:
 *   delete:
 *     description: Deletes user
 *     tags:
 *       - users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user to delete
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: users
 *         schema:
 *           $ref: '#/definitions/User'
 *   get:
 *     description: Returns user
 *     tags:
 *       - users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user to get
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: users
 *         schema:
 *           $ref: '#/definitions/User'
 *   put:
 *     description: Updates user
 *     tags:
 *       - users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to update
 *       - in: body
 *         name: id
 *         schema:
 *           type: string
 *       - in: body
 *         name: profileImageUrl
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: body
 *         name: roles
 *         type: array
 *         items:
 *           type: string
 *           example: "USER"
 *       - in: body
 *         name: flags
 *         type: object
 *       - in: body
 *         name: data
 *         description: user data
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/UserData'
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: users
 *         schema:
 *           $ref: '#/definitions/User'
 *
 */
routes.get(
  '/api/v1/users/:user_id',
  cors(),
  jwtCheck,
  BTPTokenCheck,
  resources.v1.users.get
)
routes.put('/api/v1/users/:user_id', cors(), jwtCheck, resources.v1.users.put)
routes.delete(
  '/api/v1/users/:user_id',
  cors(),
  jwtCheck,
  resources.v1.users.delete
)

/**
 * @swagger
 * /api/v1/users/{user_id}/login-token:
 *   delete:
 *     description: Logs out current user
 *     tags:
 *       - users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: succesfully logged out user
 */
routes.delete(
  '/api/v1/users/:user_id/login-token',
  cors(),
  jwtCheck,
  resources.v1.user_session.delete
)

/**
 * @swagger
 * /api/v1/users/{user_id}/streets:
 *   delete:
 *     description: Sets status to DELETED for ALL the streets of a given user
 *     tags:
 *       - users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: succesfully deleted streets
 *   get:
 *     description: Returns all streets by a given user
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the user
 *     tags:
 *       - users
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: user streets
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Street'
 */
routes.delete(
  '/api/v1/users/:user_id/streets',
  cors(),
  jwtCheck,
  resources.v1.users_streets.delete
)
routes.get(
  '/api/v1/users/:user_id/streets',
  cors(),
  resources.v1.users_streets.get
)

/**
 * @swagger
 *
 * /api/v1/streets:
 *   post:
 *     description: Creates a street
 *     tags:
 *       - streets
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: street
 *         description: Street object
 *         in: body
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/NewStreet'
 *     responses:
 *       200:
 *         description: Streets
 *         schema:
 *           $ref: '#/definitions/Street'
 */
routes.post('/api/v1/streets', jwtCheck, resources.v1.streets.post)

/**
 * @swagger
 * /api/v1/streets:
 *   get:
 *     description: Returns streets
 *     parameters:
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: namespaceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         schema:
 *           type: number
 *           example: 0
 *       - in: query
 *         name: count
 *         schema:
 *           type: number
 *           example: 20
 *     tags:
 *       - streets
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Street'
 *   head:
 *     description: Returns streets
 *     parameters:
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: namespaceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         schema:
 *           type: number
 *           example: 0
 *       - in: query
 *         name: count
 *         schema:
 *           type: number
 *           example: 20
 *     tags:
 *       - streets
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Street'
 */
routes.get('/api/v1/streets', jwtCheck, resources.v1.streets.find)
routes.head('/api/v1/streets', jwtCheck, resources.v1.streets.find)

/**
 * @swagger
 * /api/v1/streets/{street_id}:
 *   delete:
 *     description: Deletes street
 *     tags:
 *       - streets
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street to delete
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           $ref: '#/definitions/Street'
 *   head:
 *     description: Returns street
 *     tags:
 *       - streets
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street to get
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           $ref: '#/definitions/Street'
 *   get:
 *     description: Returns street
 *     tags:
 *       - streets
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street to get
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           $ref: '#/definitions/Street'
 *   put:
 *     description: Updates street
 *     tags:
 *       - streets
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street to update
 *       - in: body
 *         name: name
 *         schema:
 *           type: string
 *       - in: body
 *         name: originalStreetId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: body
 *         name: data
 *         description: Street data
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/StreetData'
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: streets
 *         schema:
 *           $ref: '#/definitions/Street'
 *
 */
routes.delete(
  '/api/v1/streets/:street_id',
  jwtCheck,
  resources.v1.streets.delete
)
routes.head('/api/v1/streets/:street_id', jwtCheck, resources.v1.streets.get)
routes.get('/api/v1/streets/:street_id', jwtCheck, resources.v1.streets.get)
routes.put('/api/v1/streets/:street_id', jwtCheck, resources.v1.streets.put)

/**
 * @swagger
 * /api/v1/streets/images/{street_id}:
 *   delete:
 *     description: Deletes street thumbnail from cloudinary
 *     tags:
 *       - images
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street
 *     produces:
 *       - application/json
 *     responses:
 *       204:
 *         description: Success
 *   get:
 *     description: Returns street thumbnail from cloudinary, mainly used to set metatag information for social sharing cards
 *     tags:
 *       - images
 *     parameters:
 *      - in: path
 *        name: street_id
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: ID of the street
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: street image
 *         schema:
 *           $ref: '#/definitions/StreetImageData'
 *       204:
 *         description: Empty response. The owner of this street has deleted the thumbnail.
 *   post:
 *     description: Creates a street thumbnail
 *     tags:
 *       - images
 *     parameters:
 *       - in: path
 *         name: street_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the street to update
 *       - in: body
 *         name: street image
 *         description: Street image object
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/NewStreetImage'
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: street image
 *         schema:
 *           $ref: '#/definitions/StreetImageData'
 *
 */
routes.post(
  '/api/v1/streets/images/:street_id',
  bodyParser.text({ limit: '3mb' }),
  jwtCheck,
  resources.v1.street_images.post
)
routes.delete(
  '/api/v1/streets/images/:street_id',
  jwtCheck,
  resources.v1.street_images.delete
)
routes.get(
  '/api/v1/streets/images/:street_id',
  jwtCheck,
  resources.v1.street_images.get
)

/**
 * @swagger
 * /api/v1/translate/{locale_code}/{resource_name}:
 *   get:
 *     description: Returns geolocation data for the current user
 *     parameters:
 *       - in: path
 *         name: locale_code
 *         schema:
 *           type: string
 *       - in: path
 *         name: resource_name
 *         schema:
 *           type: string
 *     tags:
 *       - translation
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Translations for streetmix resources. Shape depends on resource.
 */
routes.get(
  '/api/v1/translate/:locale_code/:resource_name',
  resources.v1.translate.get
)

/**
 * @swagger
 * /api/v1/flags:
 *   get:
 *     description: Returns a list of feature flags and its global toggle state
 *     tags:
 *       - flags
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: List of feature flags
 *         schema:
 *           $ref: '#/definitions/Flags'
 */
routes.get('/api/v1/flags', cors(), resources.v1.flags.get)

/**
 * @swagger
 * /api/v1/votes:
 *   get:
 *     description: Returns a candidate street for the user to vote on
 *     tags:
 *       - sentiment
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Street data
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: object
 *             score:
 *               type: number
 *             id:
 *               type: string
 *             streetId:
 *               type: string
 *             voterId:
 *               type: string
 */
routes.get('/api/v1/votes', cors(), jwtCheck, resources.v1.votes.get)
/**
 * @swagger
 * /api/v1/votes:
 *   post:
 *     description: Adds a user's vote on a particular street
 *     tags:
 *       - sentiment
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: data
 *         description: data of the street being rated
 *         in: body
 *         type: string
 *       - name: score
 *         description: user's score of a street
 *         in: body
 *         type: number
 *       - name: streetId
 *         description: ID of street being rated
 *         in: body
 *         type: string
 *     responses:
 *       200:
 *         description: Street data
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: object
 *             score:
 *               type: number
 *             id:
 *               type: string
 *             streetId:
 *               type: string
 *             voterId:
 *               type: string
 */
routes.post('/api/v1/votes', cors(), jwtCheck, resources.v1.votes.post)
routes.put('/api/v1/votes', cors(), jwtCheck, resources.v1.votes.put)

// Catch all for all broken api paths, direct to 404 response.
routes.all('/api/*', (req, res) => {
  res
    .status(404)
    .json({ status: 404, error: 'Not found. Did you mispell something?' })
})

module.exports = routes
