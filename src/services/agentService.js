const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const disputeService = require('./disputeService');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const INVESTIGATION_AUDIT_LOG = path.join(LOGS_DIR, 'investigation-audit.jsonl');

// Tool definitions for OpenAI-compatible function calling API
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_payment',
      description: 'Fetch payment details for a given payment_id',
      parameters: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', description: 'The payment identifier (pay_xxx)' }
        },
        required: ['payment_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Fetch order and delivery details associated with a payment_id',
      parameters: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', description: 'The payment identifier (pay_xxx)' }
        },
        required: ['payment_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_evidence',
      description: 'Fetch evidence documents for a given dispute_id',
      parameters: {
        type: 'object',
        properties: {
          dispute_id: { type: 'string', description: 'The dispute identifier (disp_xxx)' }
        },
        required: ['dispute_id']
      }
    }
  }
];

/**
 * Wraps operational Phase 1 data tools
 */
function executeTool(toolName, args, assembledCase) {
  const { payment, order, evidence, dispute } = assembledCase;

  switch (toolName) {
    case 'get_payment':
      return payment ? {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        created_at: payment.created_at,
        customer_id: payment.customer_id,
        device_id: payment.device_id,
        ip_address: payment.ip_address
      } : { error: 'Payment not found' };

    case 'get_order':
      return order ? {
        id: order.id,
        payment_id: order.payment_id,
        items: order.items,
        delivery_status: order.delivery_status,
        delivery_confirmed_at: order.delivery_confirmed_at,
        shipping_address: order.shipping_address
      } : { error: 'Order not found' };

    case 'get_evidence':
      return {
        dispute_id: dispute.id,
        evidence_documents: evidence
      };

    default:
      return { error: `Unknown tool ${toolName}` };
  }
}

/**
 * Appends investigation trace to logs/investigation-audit.jsonl
 */
function logInvestigationAudit(disputeId, toolSequence, toolCalls, finalSummary) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const auditRecord = {
      timestamp: new Date().toISOString(),
      dispute_id: disputeId,
      tool_sequence: toolSequence,
      tool_calls: toolCalls,
      final_summary: finalSummary
    };

    fs.appendFileSync(INVESTIGATION_AUDIT_LOG, JSON.stringify(auditRecord) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to log investigation audit:', err);
  }
}

/**
 * Deterministic offline fallback investigation generator
 */
function fallbackInvestigation(assembledCase) {
  const { dispute, payment, order, evidence } = assembledCase;

  const toolCalls = [];
  const toolSequence = [];

  // Dynamic tool sequence decision based on reason_code
  if (dispute.reason_code === 'product_not_received' || dispute.reason_code === 'product_defective') {
    toolSequence.push('get_order', 'get_evidence');
    toolCalls.push({
      tool: 'get_order',
      args: { payment_id: dispute.payment_id },
      summary: `Order delivery status: ${order ? order.delivery_status : 'unknown'}`
    });
    toolCalls.push({
      tool: 'get_evidence',
      args: { dispute_id: dispute.id },
      summary: `Fetched ${evidence.length} evidence documents`
    });
  } else if (dispute.reason_code === 'fraudulent_transaction') {
    toolSequence.push('get_payment', 'get_evidence');
    toolCalls.push({
      tool: 'get_payment',
      args: { payment_id: dispute.payment_id },
      summary: `Payment method: ${payment ? payment.method : 'unknown'}, Device: ${payment ? payment.device_id : 'unknown'}`
    });
    toolCalls.push({
      tool: 'get_evidence',
      args: { dispute_id: dispute.id },
      summary: `Fetched ${evidence.length} evidence documents`
    });
  } else {
    toolSequence.push('get_payment', 'get_order', 'get_evidence');
    toolCalls.push({
      tool: 'get_payment',
      args: { payment_id: dispute.payment_id },
      summary: `Payment amount: ${payment ? payment.amount : 0}`
    });
    toolCalls.push({
      tool: 'get_order',
      args: { payment_id: dispute.payment_id },
      summary: `Order items: ${order && order.items ? order.items.length : 0}`
    });
    toolCalls.push({
      tool: 'get_evidence',
      args: { dispute_id: dispute.id },
      summary: `Fetched ${evidence.length} evidence documents`
    });
  }

  const presentDocs = evidence.filter(e => e.present).map(e => e.type);
  const missingDocs = evidence.filter(e => !e.present).map(e => e.type);

  const unusual = [];
  if (order && order.delivery_status !== 'delivered' && dispute.reason_code === 'product_not_received') {
    unusual.push('Order is not marked delivered despite dispute claim');
  }
  if (payment && payment.amount > 2000000) {
    unusual.push('Unusually high transaction amount');
  }

  const summary = `Investigation completed for dispute ${dispute.id} (${dispute.reason_code}). ${presentDocs.length} evidence docs present.`;

  return {
    investigation: {
      what_found: [
        `Dispute reason: ${dispute.reason_code}`,
        `Payment method: ${payment ? payment.method : 'unknown'}`,
        `Available evidence: ${presentDocs.join(', ') || 'None'}`
      ],
      missing: missingDocs,
      unusual: unusual,
      summary: summary
    },
    toolSequence,
    toolCalls
  };
}

/**
 * Runs tool-calling investigation agent for dispute_id
 */
async function runInvestigationAgent(disputeId) {
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
  const modelName = process.env.LLM_MODEL || 'meta-llama/llama-3.3-70b-instruct';

  // If no API key provided or forced offline mode, execute clean fallback
  if (!apiKey) {
    const fallbackRes = fallbackInvestigation(caseData);
    logInvestigationAudit(disputeId, fallbackRes.toolSequence, fallbackRes.toolCalls, fallbackRes.investigation.summary);
    return fallbackRes.investigation;
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
  });

  const toolCallsTrace = [];
  const toolSequence = [];

  const messages = [
    {
      role: 'system',
      content: `You are an expert fraud & dispute investigation agent for DisputeShield.
Your goal is to investigate dispute ID ${disputeId}.
Call the relevant tools dynamically to gather evidence. Do not call tools in a static fixed order; select only the tools necessary based on the dispute claim.
Return your final answer in JSON format with keys: what_found (array of strings), missing (array of strings), unusual (array of strings), summary (string).`
    },
    {
      role: 'user',
      content: `Investigate dispute ${disputeId} for payment ${caseData.dispute.payment_id}. Reason: ${caseData.dispute.reason_code}.`
    }
  ];

  try {
    let turns = 0;
    while (turns < 5) {
      turns++;
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto'
      });

      const choice = response.choices[0];
      const message = choice.message;
      messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        // Agent finished tool calling and produced final summary
        let parsed = null;
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          parsed = {
            what_found: [`Dispute ID: ${disputeId}`, `Reason: ${caseData.dispute.reason_code}`],
            missing: [],
            unusual: [],
            summary: message.content || 'Investigation completed.'
          };
        }

        logInvestigationAudit(disputeId, toolSequence, toolCallsTrace, parsed.summary || 'Completed');
        return parsed;
      }

      // Process tool calls
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || '{}');

        toolSequence.push(fnName);
        const result = executeTool(fnName, fnArgs, caseData);

        toolCallsTrace.push({
          tool: fnName,
          args: fnArgs,
          summary: `Executed ${fnName}`
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }
  } catch (err) {
    console.warn(`LLM agent execution failed (${err.message}). Using deterministic fallback.`);
  }

  // Fallback if API loop failed
  const fallbackRes = fallbackInvestigation(caseData);
  logInvestigationAudit(disputeId, fallbackRes.toolSequence, fallbackRes.toolCalls, fallbackRes.investigation.summary);
  return fallbackRes.investigation;
}

module.exports = {
  runInvestigationAgent
};
