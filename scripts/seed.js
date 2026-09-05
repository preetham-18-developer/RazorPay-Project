const fs = require('fs');
const path = require('path');

// Fixed random seed requirement: 20260822
const SEED = 20260822;

/**
 * Mulberry32 seedable pseudo-random number generator
 * Ensures 100% deterministic dataset generation across multiple runs.
 */
function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prng = createPRNG(SEED);

function rand() {
  return prng();
}

function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function pad(num, size = 4) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

// Sample catalog for realistic synthetic data
const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', postal: '560001' },
  { city: 'Mumbai', state: 'Maharashtra', postal: '400001' },
  { city: 'Delhi', state: 'Delhi', postal: '110001' },
  { city: 'Hyderabad', state: 'Telangana', postal: '500001' },
  { city: 'Chennai', state: 'Tamil Nadu', postal: '600001' },
  { city: 'Kolkata', state: 'West Bengal', postal: '700001' },
  { city: 'Pune', state: 'Maharashtra', postal: '411001' },
  { city: 'Ahmedabad', state: 'Gujarat', postal: '380001' }
];

const ITEM_CATALOG = [
  { name: 'Wireless Headphones', basePrice: 249900 },
  { name: 'Smart Fitness Watch', basePrice: 499900 },
  { name: 'Ergonomic Gaming Mouse', basePrice: 129900 },
  { name: 'Mechanical Keyboard', basePrice: 349900 },
  { name: 'Portable Bluetooth Speaker', basePrice: 189900 },
  { name: 'Noise-Cancelling Earbuds', basePrice: 599900 },
  { name: 'USB-C Fast Charger Hub', basePrice: 89900 },
  { name: 'Ultra-wide HD Monitor', basePrice: 1899900 },
  { name: 'Leather Laptop Bag', basePrice: 299900 },
  { name: 'Smart Home Security Camera', basePrice: 399900 }
];

const REASON_DESCRIPTIONS = {
  product_not_received: 'Customer claims the product was not received.',
  fraudulent_transaction: 'Customer claims the transaction was unauthorized or fraudulent.',
  duplicate_charge: 'Customer claims they were charged multiple times for a single order.',
  product_defective: 'Customer claims the item received was defective or not as described.',
  service_not_rendered: 'Customer claims the service or digital fulfillment was incomplete.',
  credit_not_processed: 'Customer claims refund was promised but credit not reflected.'
};

const PAYMENT_METHODS = ['upi', 'card', 'netbanking'];

function generateIP() {
  return `${randInt(49, 203)}.${randInt(1, 254)}.${randInt(1, 254)}.${randInt(1, 254)}`;
}

function generateDate(startYear = 2026, month = 1, dayMin = 1, dayMax = 20) {
  const day = randInt(dayMin, dayMax);
  const hour = randInt(8, 20);
  const min = randInt(10, 59);
  const sec = randInt(10, 59);
  const date = new Date(Date.UTC(startYear, month - 1, day, hour, min, sec));
  return date.toISOString();
}

function addDaysISO(isoString, days, addHours = 0) {
  const d = new Date(isoString);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(d.getUTCHours() + addHours);
  return d.toISOString();
}

function isoToUnixSeconds(isoString) {
  return Math.floor(new Date(isoString).getTime() / 1000);
}

// Scenario plan definitions (total 110 disputes)
const SCENARIO_SPECS = [
  { name: 'genuine_non_delivery', count: 15 },
  { name: 'delivered_but_disputed', count: 15 },
  { name: 'refund_already_issued', count: 10 },
  { name: 'duplicate_dispute', count: 10 },
  { name: 'suspicious_device_ip', count: 10 },
  { name: 'high_velocity', count: 10 },
  { name: 'unusual_transaction_amount', count: 10 },
  { name: 'missing_critical_evidence', count: 10 },
  { name: 'genuine_fraud', count: 10 },
  { name: 'ambiguous_mixed_signals', count: 10 }
];

function buildDataset() {
  const payments = [];
  const orders = [];
  const disputes = [];
  const evidenceMap = {};
  const groundTruthMap = {};

  let disputeIndex = 1;
  let paymentIndex = 1;

  // We will iterate scenario by scenario
  for (const spec of SCENARIO_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      const dispId = `disp_SYN${pad(disputeIndex)}`;
      let payId;
      let payment;
      let order;

      // Handle duplicate dispute scenario specially (re-uses an existing payment)
      if (spec.name === 'duplicate_dispute' && payments.length > 0) {
        // Pick one of the previously created payments
        const existingPayment = payments[(disputeIndex - 1) % payments.length];
        payId = existingPayment.id;
        payment = existingPayment;
        order = orders.find(o => o.payment_id === payId);
      } else {
        payId = `pay_SYN${pad(paymentIndex)}`;
        const orderId = `order_SYN${pad(paymentIndex)}`;
        paymentIndex++;

        const custId = `cust_${pad(randInt(1, 40), 3)}`;
        const devId = `dev_${pad(randInt(1, 40), 3)}`;
        const ipAddr = generateIP();
        const payMethod = choice(PAYMENT_METHODS);

        const itemTemplate = choice(ITEM_CATALOG);
        let amount = itemTemplate.basePrice;
        if (spec.name === 'unusual_transaction_amount') {
          // Extremely high or atypical amount
          amount = randInt(1500000, 4500000); // 15,000 to 45,000 INR in paise
        }

        const createdAtISO = generateDate(2026, randInt(1, 2), 1, 15);

        payment = {
          id: payId,
          amount: amount,
          method: payMethod,
          created_at: createdAtISO,
          customer_id: custId,
          device_id: devId,
          ip_address: ipAddr
        };
        payments.push(payment);

        // Build order
        const cityObj = choice(CITIES);
        let delivStatus = 'delivered';
        let delivConfirmedAt = addDaysISO(createdAtISO, randInt(2, 4), randInt(1, 5));

        if (spec.name === 'genuine_non_delivery') {
          delivStatus = choice(['in_transit', 'not_shipped']);
          delivConfirmedAt = null;
        } else if (spec.name === 'delivered_but_disputed') {
          delivStatus = 'delivered';
        } else if (spec.name === 'missing_critical_evidence') {
          delivStatus = choice(['delivered', 'in_transit']);
          if (delivStatus !== 'delivered') delivConfirmedAt = null;
        }

        order = {
          id: orderId,
          payment_id: payId,
          items: [
            {
              name: itemTemplate.name,
              quantity: 1,
              price: amount
            }
          ],
          delivery_status: delivStatus,
          delivery_confirmed_at: delivConfirmedAt,
          shipping_address: {
            line1: `${randInt(10, 99)} Example Street`,
            city: cityObj.city,
            state: cityObj.state,
            postal_code: cityObj.postal,
            country: 'IN'
          }
        };
        orders.push(order);
      }

      // Build dispute
      const dispCreatedAt = addDaysISO(payment.created_at, randInt(3, 8));
      const respondByDays = randInt(3, 5);
      const respondByUnix = isoToUnixSeconds(dispCreatedAt) + (respondByDays * 86400);

      let reasonCode = 'product_not_received';
      let groundTruth = 'legitimate_dispute';

      switch (spec.name) {
        case 'genuine_non_delivery':
          reasonCode = 'product_not_received';
          groundTruth = 'legitimate_dispute';
          break;

        case 'delivered_but_disputed':
          reasonCode = 'product_not_received';
          groundTruth = 'friendly_fraud';
          break;

        case 'refund_already_issued':
          reasonCode = choice(['credit_not_processed', 'duplicate_charge']);
          groundTruth = (i < 7) ? 'friendly_fraud' : 'legitimate_dispute';
          break;

        case 'duplicate_dispute':
          reasonCode = choice(['duplicate_charge', 'product_not_received']);
          groundTruth = 'friendly_fraud';
          break;

        case 'suspicious_device_ip':
          reasonCode = 'fraudulent_transaction';
          groundTruth = (i < 8) ? 'genuine_fraud' : 'legitimate_dispute';
          break;

        case 'high_velocity':
          reasonCode = 'fraudulent_transaction';
          groundTruth = (i < 8) ? 'genuine_fraud' : 'legitimate_dispute';
          break;

        case 'unusual_transaction_amount':
          reasonCode = choice(['fraudulent_transaction', 'service_not_rendered']);
          groundTruth = (i < 6) ? 'genuine_fraud' : 'legitimate_dispute';
          break;

        case 'missing_critical_evidence':
          reasonCode = choice(['product_not_received', 'service_not_rendered']);
          groundTruth = (i % 2 === 0) ? 'legitimate_dispute' : 'friendly_fraud';
          break;

        case 'genuine_fraud':
          reasonCode = 'fraudulent_transaction';
          groundTruth = 'genuine_fraud';
          break;

        case 'ambiguous_mixed_signals':
          reasonCode = choice(['product_defective', 'service_not_rendered', 'fraudulent_transaction']);
          groundTruth = (i < 4) ? 'genuine_fraud' : (i < 7 ? 'friendly_fraud' : 'legitimate_dispute');
          break;
      }

      const dispute = {
        id: dispId,
        payment_id: payId,
        amount: payment.amount,
        reason_code: reasonCode,
        reason_description: REASON_DESCRIPTIONS[reasonCode] || 'Dispute raised by issuer.',
        status: choice(['open', 'open', 'open', 'under_review']),
        respond_by: respondByUnix,
        created_at: dispCreatedAt
      };

      disputes.push(dispute);

      // Build Evidence documents for this dispute
      // Types: payment_confirmation, delivery_confirmation, customer_communication, terms_acceptance, shipping_record
      let hasPayConf = true;
      let hasDelivConf = (order.delivery_status === 'delivered');
      let hasCustComm = (rand() > 0.3);
      let hasTermsAcc = true;
      let hasShipRec = (order.delivery_status !== 'not_shipped');

      if (spec.name === 'missing_critical_evidence') {
        hasDelivConf = false;
        hasShipRec = false;
        hasTermsAcc = (i % 2 === 0);
      } else if (spec.name === 'genuine_fraud') {
        hasCustComm = false;
        hasDelivConf = false;
      }

      const evidenceDocs = [
        {
          type: 'payment_confirmation',
          present: hasPayConf,
          doc_id: hasPayConf ? `doc_${dispId}_payment` : null
        },
        {
          type: 'delivery_confirmation',
          present: hasDelivConf,
          doc_id: hasDelivConf ? `doc_${dispId}_delivery` : null
        },
        {
          type: 'customer_communication',
          present: hasCustComm,
          doc_id: hasCustComm ? `doc_${dispId}_comm` : null
        },
        {
          type: 'terms_acceptance',
          present: hasTermsAcc,
          doc_id: hasTermsAcc ? `doc_${dispId}_terms` : null
        },
        {
          type: 'shipping_record',
          present: hasShipRec,
          doc_id: hasShipRec ? `doc_${dispId}_shipping` : null
        }
      ];

      evidenceMap[dispId] = evidenceDocs;
      groundTruthMap[dispId] = groundTruth;

      disputeIndex++;
    }
  }

  return { payments, orders, disputes, evidenceMap, groundTruthMap };
}

function main() {
  console.log(`[Seed] Generating synthetic dataset with SEED=${SEED}...`);
  const data = buildDataset();

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, 'payments.json'), JSON.stringify(data.payments, null, 2));
  fs.writeFileSync(path.join(dataDir, 'orders.json'), JSON.stringify(data.orders, null, 2));
  fs.writeFileSync(path.join(dataDir, 'disputes.json'), JSON.stringify(data.disputes, null, 2));
  fs.writeFileSync(path.join(dataDir, 'evidence.json'), JSON.stringify(data.evidenceMap, null, 2));
  fs.writeFileSync(path.join(dataDir, 'ground-truth.json'), JSON.stringify(data.groundTruthMap, null, 2));

  console.log(`[Seed] Successfully generated dataset:`);
  console.log(`       - Payments: ${data.payments.length}`);
  console.log(`       - Orders: ${data.orders.length}`);
  console.log(`       - Disputes: ${data.disputes.length}`);
  console.log(`       - Evidence records: ${Object.keys(data.evidenceMap).length}`);
  console.log(`       - Ground truth records: ${Object.keys(data.groundTruthMap).length}`);
}

main();
