const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const port = process.env.PORT

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({
  extended: true
}));

// parse application/json
app.use(express.json());

app.use(cors())

app.post('/pay', async (req, res) => {
    const {email} = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
        amount: 5000.00,
        currency: 'INR',    
        // Verify your integration in this guide by including this parameter
        metadata: {integration_check: 'accept_a_payment'},
        receipt_email: email,
      });

      res.json({'client_secret': paymentIntent['client_secret']})
})

app.post('/sub', async (req, res) => {
  const {email, payment_method} = req.body;

  const customer = await stripe.customers.create({
    payment_method: payment_method,
    email: email,
    name: 'Mohit Patel',
    description: 'test description',
    invoice_settings: {
      default_payment_method: payment_method,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ plan: process.env.SUBSCRIPTION_PRODUCT_KEY }],
    expand: ['latest_invoice.payment_intent']
  });
  
  const status = subscription['latest_invoice']['payment_intent']['status'] 
  const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']

  res.json({'client_secret': client_secret, 'status': status});
})

app.post('/webhooks', (req, res) => {
  // const sig = req.headers['stripe-signature'];
  // const endpointSecret = process.env.STRIPE_WEBHOOK_ENDPOINT;

  let event;

  try {
    event = req.body;
    // event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret); // not using signature as of now
  }
  catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const email = event['data']['object']['receipt_email'] // contains the email that will recive the recipt for the payment (users email usually)
      console.log(`PaymentIntent was successful for ${email}!`)
      break;
    }
    default:
      // Unexpected event type
      return res.status(400).end();
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))