const User = require('../../db/models/user.js')
const Vote = require('../../db/models/vote.js')
const logger = require('../../../lib/logger.js')()

exports.get = async function (req, res) {
  // const query = req.query
  const userId = req.userId

  if (!userId) {
    res.status(401).json({ status: 401, msg: 'Please provide user ID.' })
    return
  }

  let user

  try {
    user = await User.findOne({ where: { id: userId } })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ status: 500, msg: 'Error finding user.' })
    return
  }

  if (!user) {
    res.status(403).json({ status: 403, msg: 'User not found.' })
    return
  }

  // Is requesting user logged in?
  if (!req.user || !req.user.sub || req.user.sub !== user.id) {
    res.status(401).end()
    return
  }

  // If requesting user is logged in, send them a street
  let ballot
  try {
    ballot = await Vote.findOne({ where: { userId: null }, order: 'random()' })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ status: 500, msg: 'Error fetching ballot.' })
    return
  }
  const payload = { ballot }

  res.status(200).json(payload)
}

exports.post = async function (req, res) {
  const userId = req.userId

  if (!userId) {
    res.status(401).json({ status: 401, msg: 'Please provide user ID.' })
    return
  }

  let user

  try {
    user = await User.findOne({ where: { id: userId } })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ status: 500, msg: 'Error finding user.' })
    return
  }

  if (!user) {
    res.status(403).json({ status: 403, msg: 'User not found.' })
    return
  }

  // Is requesting user logged in?
  if (!req.user || !req.user.sub || req.user.sub !== user.id) {
    res.status(401).end()
    return
  }

  // If requesting user is logged in, create a new vote
  const ballot = {}
  try {
    ballot.data = req.body.data
    ballot.score = req.body.score
    ballot.streetId = req.body.streetId
    ballot.voterId = userId
    await Vote.create(ballot)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ status: 500, msg: 'Error filling ballot.' })
    return
  }
  const payload = { ballot }

  res.status(200).json(payload)
}
