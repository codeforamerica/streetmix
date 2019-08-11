const config = require('config')
const stripe = require('stripe')(config.stripe.api_secret)
const User = require('../../models/user.js')
const roles = require('../../data/user_roles.json')
const logger = require('../../../lib/logger.js')()
const tier1PlanId = config.stripe.tier1_plan_id

// TODO import this from user_roles.json
const planMap = {
  [tier1PlanId]: roles.TIER1
}

exports.post = async (req, res) => {
  let userId
  let subscription
  let customer
  try {
    userId = req.body.userId
    logger.info(`submitting payment for ${userId}`)
    const { token: { email, id } } = req.body

    customer = await stripe.customers.create({
      email,
      source: id,
      description: `Subscriber for ${userId}`
    })

    subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          plan: tier1PlanId
        }
      ]
    })
  } catch (err) {
    logger.error(err)
    res.status(500).send({ status: 500, msg: 'Unexpected error while submitting payment.' })
    return
  }

  let user
  try {
    user = await User.findOne({ id: userId })
  } catch (err) {
    logger.error(err)
    res.status(401).send({ status: 401, msg: 'Unexpected error while finding user.' })
    return
  }

  if (!user) {
    res.status(404).send({ status: 404, msg: 'Could not find user data.' })
  }

  try {
    const { data, roles } = user
    console.log({ user })
    const newRole = planMap[tier1PlanId]

    // do not add role if the user already has it
    if (!roles.includes(newRole)) {
      roles.push(newRole)
      user.roles = roles
    }
    console.log(JSON.stringify({ roles }))
    const now = new Date()
    const newData = { ...data, subscribed: now, subscriptionId: subscription.id, customerId: customer.id, planId: tier1PlanId }
    user.data = newData
    user.save().then(upgradedUser => {
      res.status(200).send({ user: upgradedUser, subscription })
    })

    return
  } catch (err) {
    logger.error(err)
    res.status(500).send({ status: 500, msg: 'Unexpected error while processing payment.' })
  }
}
