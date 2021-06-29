const config = require('config')
const cloudinary = require('cloudinary')
const { ERRORS, asUserJson } = require('../../../lib/util')
const logger = require('../../../lib/logger.js')()
const { User } = require('../../db/models')

exports.post = async function (req, res) {
  const handleCreateUser = function (user) {
    if (!user) {
      res.status(500).json({
        status: 500,
        msg: 'Could not create user, user not found after creation.'
      })
      return
    }
    const userJson = { id: user.id }
    logger.info({ user: userJson }, 'New user created.')
    res.header('Location', config.restapi.baseuri + '/v1/users/' + user.id)
    res.status(201).send(userJson)
  } // END function - handleCreateUser

  const handleCreateUserError = function (err) {
    if (err) {
      logger.error(err)
      res.status(500).json({ status: 500, msg: 'Could not create user.' })
    }
  }

  const handleUpdateUserError = function (err) {
    if (err) {
      logger.error(err)
      res.status(500).json({ status: 500, msg: 'Could not update user.' })
    }
  }

  const handleUpdateUser = function (user) {
    const userJson = { id: user.id }
    logger.info({ user: userJson }, 'Existing user logged in.')

    res.header('Location', config.restapi.baseuri + '/v1/users/' + user.id)
    res.status(200).send(userJson)
  } // END function - handleUpdateUser

  // TODO: find out if this is called still and why its seperate from handleAuth0SignIn
  const handleAuth0TwitterSignIn = async function (credentials) {
    try {
      let user
      if (credentials.screenName) {
        user = await User.findOne({ where: { auth0Id: credentials.auth0Id } })
      }
      if (!user) {
        const newUserData = {
          id: credentials.screenName,
          auth0Id: credentials.auth0Id,
          profileImageUrl: credentials.profileImageUrl
        }
        try {
          User.create(newUserData).then(handleCreateUser)
        } catch (err) {
          handleCreateUserError(err)
        }
      } else {
        const userUpdates = user.toJSON()
        userUpdates.auth0Id = credentials.auth0Id
        userUpdates.profileImageUrl = credentials.profileImageUrl

        try {
          const [numUsersUpdated, updatedUser] = await User.update(
            userUpdates,
            {
              where: { auth0Id: credentials.auth0Id },
              returning: true
            }
          )

          if (numUsersUpdated !== 1) {
            logger.info(
              `Updated data for ${numUsersUpdated} users based on auth0 credentials`
            )
          }
          handleUpdateUser(updatedUser)
        } catch (err) {
          handleUpdateUserError(err)
        }
      }
    } catch (err) {
      logger.error(err)
      res.status(500).json({
        status: 500,
        msg: 'Error finding user with Auth0 Twitter sign-in.'
      })
    }
  } // END function - handleAuth0TwitterSignIn
  /**
   * Returns a randomly-generated 4-digit string of a number between 0000 and 9999
   *
   * @returns {string}
   */
  const generateRandomId = () =>
    Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')

  const generateId = function (nickname) {
    // TODO - Check if the Id generated is not existing
    const id = generateRandomId()
    return nickname + '-' + id
  }

  const handleUserProfileImage = async function (user, credentials) {
    const publicId = `${config.env}/profile_image/${user.id}`
    let profileImageUrl

    // Check if user has profile image already cached in cloudinary
    if (user.profileImageUrl && user.profileImageUrl.includes(publicId)) {
      profileImageUrl = user.profileImageUrl
    } else if (credentials.profileImageUrl) {
      // If no profile image cached in cloudinary, cache image provided by credentials and return cloudinary url.
      try {
        const response = await cloudinary.v2.uploader.upload(
          credentials.profileImageUrl,
          { upload_preset: 'profile_image', public_id: publicId }
        )
        profileImageUrl = response.secure_url
      } catch (error) {
        logger.error(error)
        // If unable to cache image, return credentials.profileImageUrl.
        profileImageUrl = credentials.profileImageUrl
      }
    }

    return profileImageUrl
  }

  // TODO: pretty sure usage of findOrCreate would simplify much of this
  const handleAuth0SignIn = async function (credentials) {
    try {
      let user
      if (credentials.auth0Id) {
        user = await User.findOne({ where: { auth0Id: credentials.auth0Id } })
      }
      if (!user) {
        const numOfUser = await User.findOne({
          where: { id: credentials.nickname }
        })

        // Ensure there is no existing user with id same this nickname
        if (!numOfUser) {
          const newUserData = {
            id: credentials.nickname,
            auth0Id: credentials.auth0Id,
            email: credentials.email,
            profileImageUrl: credentials.profileImageUrl
          }
          try {
            User.create(newUserData).then(handleCreateUser)
          } catch (err) {
            handleCreateUserError(err)
          }
        } else {
          const id = generateId(credentials.nickname)
          const newUserData = {
            id: id,
            auth0Id: credentials.auth0Id,
            email: credentials.email,
            profileImageUrl: credentials.profileImageUrl
          }
          User.create(newUserData).then(handleCreateUser)
        }
      } else {
        const profileImageUrl = await handleUserProfileImage(user, credentials)
        const userUpdates = user.toJSON()
        userUpdates.auth0Id = credentials.auth0Id
        userUpdates.profileImageUrl = profileImageUrl
        userUpdates.email = credentials.email

        try {
          const [numUsersUpdated, updatedUser] = await User.update(
            userUpdates,
            {
              where: { auth0Id: credentials.auth0Id },
              returning: true
            }
          )

          if (numUsersUpdated !== 1) {
            logger.info(
              `Updated data for ${numUsersUpdated} users based on auth0 credentials`
            )
          }
          // TODO check here that only 1 user is updated
          handleUpdateUser(updatedUser[0])
        } catch (err) {
          handleUpdateUserError(err)
        }
      }
    } catch (err) {
      logger.error(err)
      res
        .status(500)
        .json({ status: 500, msg: 'Error finding user with Auth0 ID.' })
    }
  } // END function - handleAuth0SignIn

  let body
  try {
    body = req.body
  } catch (e) {
    res.status(400).json({ status: 400, msg: 'Could not parse body as JSON.' })
    return
  }

  logger.info(body)
  if (Object.prototype.hasOwnProperty.call(body, 'auth0_twitter')) {
    handleAuth0TwitterSignIn(body.auth0_twitter)
  } else if (Object.prototype.hasOwnProperty.call(body, 'auth0')) {
    handleAuth0SignIn(body.auth0)
  } else {
    res.status(400).json({ status: 400, msg: 'Unknown sign-in method used.' })
  }
} // END function - exports.post

exports.get = async function (req, res) {
  // Flag error if user ID is not provided
  const userId = req.params.user_id

  const handleError = function (error) {
    switch (error) {
      case ERRORS.USER_NOT_FOUND:
        res.status(404).json({ status: 404, msg: 'User not found.' })
        return
      case ERRORS.CANNOT_GET_USER:
        res.status(500).json({ status: 500, msg: 'Error finding user.' })
        return
      case ERRORS.UNAUTHORISED_ACCESS:
        res
          .status(401)
          .json({ status: 401, msg: 'User with that login token not found.' })
        return
      default:
        res.status(500).end()
    }
  }

  // this function seems like it could be replaced by sequelize findByPK
  const findUserById = async function (userId) {
    let user
    try {
      user = await User.findOne({ where: { id: userId } })
    } catch (err) {
      logger.error(err)
      throw new Error(ERRORS.CANNOT_GET_USER)
    }

    // blocks users from learning about each other (e.g. user galleries)
    // if (!req.user || !req.user.sub || req.user.sub !== user.id) {
    //   res.status(401).end()
    //   return
    // }
    if (!user) {
      throw new Error(ERRORS.USER_NOT_FOUND)
    }
    return user
  }

  if (!userId) {
    if (!req.user || !req.user.sub) {
      res
        .status(401)
        .json({ status: 401, msg: 'Please sign in to get all users.' })
    }

    const callingUser = await User.findOne({
      where: { auth0_id: req.user.sub }
    })

    const isAdmin =
      callingUser &&
      callingUser.roles &&
      callingUser.roles.indexOf('ADMIN') !== -1

    if (isAdmin) {
      const userList = await User.findAll({ raw: true })
      res.status(200).send(asUserJson(userList))
      return
    }

    res.status(401).json({ status: 401, msg: 'Please provide user ID.' })
    return
  }

  try {
    const result = await findUserById(userId)
    res.status(200).send(asUserJson(result))
  } catch (err) {
    handleError(err)
  }
} // END function - exports.get

exports.delete = async function (req, res) {
  const userId = req.params.user_id
  let user
  try {
    user = await User.findOne({ where: { id: userId } })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ status: 500, msg: 'Error finding user.' })
  }

  if (!user) {
    res.status(404).json({ status: 404, msg: 'User not found.' })
    return
  }

  const callingUser = await User.findOne({
    where: { auth0_id: req.user.sub }
  })

  const isAdmin =
    callingUser &&
    callingUser.roles &&
    callingUser.roles.indexOf('ADMIN') !== -1

  const isSameUser = user.id === callingUser.id
  if (!isSameUser && !isAdmin) {
    res.status(401).end()
    return
  }
  User.update(user, { where: { id: user.id }, returning: true })
    .then((result) => {
      res.status(204).end()
    })
    .catch((err) => {
      logger.error(err)
      res.status(500).json({ status: 500, msg: 'Could not sign-out user.' })
    })
} // END function - exports.delete

exports.put = async function (req, res) {
  let body
  try {
    body = req.body
  } catch (e) {
    res.status(400).json({ status: 400, msg: 'Could not parse body as JSON.' })
    return
  }

  if (!(req.user && req.user.sub)) {
    res.status(401).json({ status: 401, msg: 'User auth not found.' })
  }

  const userId = req.params.user_id
  let user

  try {
    user = await User.findOne({ where: { id: userId } })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ status: 500, msg: 'Error finding user.' })
  }

  if (!user || !req.user.sub) {
    res.status(404).json({ status: 404, msg: 'User not found.' })
    return
  }

  const callingUser = await User.findOne({
    where: { auth0_id: req.user.sub }
  })

  const isAdmin =
    callingUser &&
    callingUser.roles &&
    callingUser.roles.indexOf('ADMIN') !== -1

  if (!isAdmin && callingUser.id !== userId) {
    res.status(401).end()
    return
  }

  User.update(
    {
      data: body.data || {}
    },
    { where: { id: user.id }, returning: true }
  )
    .then((result) => {
      res.status(204).end()
    })
    .catch((err) => {
      logger.error(err)
      res
        .status(500)
        .json({ status: 500, msg: 'Could not update user information.' })
    })
} // END function - exports.put
