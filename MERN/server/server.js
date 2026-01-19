const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

// Import models
const Thread = require('./models/Thread');
const Message = require('./models/Message');
const CarListing = require('./models/CarListing');

const app = express();
const PORT = process.env.PORT || 5000;

// Track pending responses by thread ID (to cancel if new message arrives)
const pendingResponses = new Map();

// Mobile Text Alerts API configuration
const MTA_API_BASE_URL = 'https://api.mobile-text-alerts.com/v3';
const MTA_API_KEY = process.env.MTA_API_KEY;
const MTA_PHONE_NUMBER = '+18776647380'; // Your Mobile Text Alerts phone number
const MTA_LONGCODE_ID = 8337441549; // Your longcode ID (from dedicated-numbers endpoint)
const MTA_AUTO_REPLY_TEMPLATE_ID = process.env.MTA_AUTO_REPLY_TEMPLATE_ID 
  ? parseInt(process.env.MTA_AUTO_REPLY_TEMPLATE_ID, 10) 
  : null; // Template ID for auto-replies (must be an integer)

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not found in environment variables. AI agent will not work.');
}

if (!MTA_API_KEY) {
  console.warn('Warning: MTA_API_KEY not found in environment variables. SMS functionality will be limited.');
}

if (MTA_AUTO_REPLY_TEMPLATE_ID) {
  console.log(`✅ Auto-reply template ID loaded: ${MTA_AUTO_REPLY_TEMPLATE_ID}`);
} else {
  console.log('ℹ️  No auto-reply template ID configured. Custom messages will be used (requires verified account).');
}


// Helper function to build conversation transcript from messages
async function buildConversationTranscript(threadId) {
  const messages = await Message.find({ threadId })
    .sort({ timestamp: 1 })
    .exec();

  const transcript = messages.map(msg => {
    const sender = msg.direction === 'inbound' ? 'Dealer' : 'You';
    return `${sender}: ${msg.body}`;
  }).join('\n');

  return transcript;
}

// Helper function to extract car listing data from conversation using GPT-4o
async function extractCarListingData(conversationTranscript) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const extractionPrompt = `Extract the following information from this conversation between a car buyer and dealer. Return ONLY a JSON object with the extracted data. If information is not available, use null. Make sure numbers are actual numbers, not strings.

Required fields:
- make: string (car make, e.g., "Toyota", "Honda")
- model: string (car model, e.g., "Camry", "Civic")
- year: number (car year, e.g., 2020)
- miles: number (number of miles, e.g., 50000)
- listingPrice: number (listing price in dollars, e.g., 15000)
- tireLifeLeft: boolean (whether tires have life left - true for yes, false for no)
- titleStatus: string ("clean", "rebuilt", "check_carfax", or null) - "clean" or "rebuilt" if mentioned, "check_carfax" if dealer provided a carfax link, null if not mentioned
- carfaxDamageIncidents: string ("yes", "no", "unsure", "check_carfax", or null) - "yes" if carfax shows prior damage incidents, "no" if it doesn't, "check_carfax" if dealer provided a link but you haven't reviewed it, null if not mentioned
- docFeeQuoted: number (doc fee amount quoted in dollars, e.g., 500)
- docFeeNegotiable: boolean (whether doc fee is negotiable - true for yes, false for no)
- docFeeAgreed: number (doc fee agreed upon after negotiation in dollars, e.g., 400). If the doc fee was negotiated and a new amount was agreed upon, use that amount. If no negotiation occurred or the dealer did not agree to a different amount, use the same value as docFeeQuoted. If docFeeQuoted is not available, use null.
- lowestPrice: number (lowest price dealer will accept in dollars, e.g., 14000)

Conversation transcript:
${conversationTranscript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "make": "string or null",
  "model": "string or null",
  "year": number or null,
  "miles": number or null,
  "listingPrice": number or null,
  "tireLifeLeft": boolean or null,
  "titleStatus": "string ('clean', 'rebuilt', 'check_carfax') or null",
  "carfaxDamageIncidents": "string ('yes', 'no', 'unsure', 'check_carfax') or null",
  "docFeeQuoted": number or null,
  "docFeeNegotiable": boolean or null,
  "docFeeAgreed": number or null,
  "lowestPrice": number or null
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a data extraction assistant. Extract structured data from conversations and return only valid JSON.' },
        { role: 'user', content: extractionPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const data = JSON.parse(response);
    
    // Ensure numbers are actually numbers
    const extractedData = {
      make: data.make || null,
      model: data.model || null,
      year: data.year !== null && data.year !== undefined ? Number(data.year) : null,
      miles: data.miles !== null && data.miles !== undefined ? Number(data.miles) : null,
      listingPrice: data.listingPrice !== null && data.listingPrice !== undefined ? Number(data.listingPrice) : null,
      tireLifeLeft: data.tireLifeLeft !== null && data.tireLifeLeft !== undefined ? Boolean(data.tireLifeLeft) : null,
      titleStatus: data.titleStatus && ['clean', 'rebuilt', 'check_carfax'].includes(data.titleStatus.toLowerCase()) ? data.titleStatus.toLowerCase() : null,
      carfaxDamageIncidents: (() => {
        if (data.carfaxDamageIncidents === null || data.carfaxDamageIncidents === undefined) return null;
        if (typeof data.carfaxDamageIncidents === 'boolean') {
          return data.carfaxDamageIncidents ? 'yes' : 'no';
        }
        if (typeof data.carfaxDamageIncidents === 'string') {
          const lower = data.carfaxDamageIncidents.toLowerCase();
          if (['yes', 'no', 'unsure', 'check_carfax'].includes(lower)) return lower;
        }
        return null;
      })(),
      docFeeQuoted: data.docFeeQuoted !== null && data.docFeeQuoted !== undefined ? Number(data.docFeeQuoted) : null,
      docFeeNegotiable: data.docFeeNegotiable !== null && data.docFeeNegotiable !== undefined ? Boolean(data.docFeeNegotiable) : null,
      docFeeAgreed: (() => {
        // If docFeeAgreed was extracted, use it
        if (data.docFeeAgreed !== null && data.docFeeAgreed !== undefined) {
          return Number(data.docFeeAgreed);
        }
        // If no negotiation occurred, default to docFeeQuoted
        if (data.docFeeQuoted !== null && data.docFeeQuoted !== undefined) {
          return Number(data.docFeeQuoted);
        }
        return null;
      })(),
      lowestPrice: data.lowestPrice !== null && data.lowestPrice !== undefined ? Number(data.lowestPrice) : null
    };

    return extractedData;
  } catch (error) {
    console.error('Error extracting car listing data:', error.message);
    throw error;
  }
}

// Helper function to detect if dealer says they'll get back to the agent
function dealerSaysWillGetBack(message) {
  const patterns = [
    /will get back/i,
    /get back to you/i,
    /will update you/i,
    /update you as soon/i,
    /will reach out/i,
    /reach out as soon/i,
    /will be in touch/i,
    /be in touch as soon/i,
    /working to get/i,
    /gathering.*information/i,
    /collecting.*information/i,
    /looking into/i,
    /will provide/i,
    /provide.*as soon/i
  ];
  
  return patterns.some(pattern => pattern.test(message));
}

// Helper function to detect if dealer message contains new information vs just acknowledgment
async function messageContainsNewInformation(message, knownData = null) {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback: if no API key, assume it might have info
    return true;
  }

  // Check for common acknowledgment phrases that indicate no new info
  const acknowledgmentPatterns = [
    /sounds good/i,
    /will get back/i,
    /get back to you/i,
    /will update you/i,
    /update you as soon/i,
    /will reach out/i,
    /reach out as soon/i,
    /will be in touch/i,
    /be in touch as soon/i,
    /working to get/i,
    /gathering.*information/i,
    /collecting.*information/i,
    /looking into/i,
    /will provide/i,
    /provide.*as soon/i,
    /thank you for your patience/i,
    /thank you for checking in/i,
    /still working/i,
    /still gathering/i,
    /still collecting/i
  ];

  // If message is just acknowledgment, return false
  const isJustAcknowledgment = acknowledgmentPatterns.some(pattern => pattern.test(message)) &&
    !/\d+/.test(message) && // No numbers (could be mileage, price, etc.)
    !/\$/.test(message); // No dollar signs (could be price, doc fee, etc.)

  if (isJustAcknowledgment) {
    return false;
  }

  // Use GPT to check if message contains new information
  try {
    let knownInfoSection = '';
    if (knownData) {
      const knownFields = [];
      if (knownData.make) knownFields.push(`- Car make: ${knownData.make}`);
      if (knownData.model) knownFields.push(`- Car model: ${knownData.model}`);
      if (knownData.year) knownFields.push(`- Car year: ${knownData.year}`);
      if (knownData.miles !== null) knownFields.push(`- Number of miles: ${knownData.miles.toLocaleString()}`);
      if (knownData.listingPrice !== null) knownFields.push(`- Listing price: $${knownData.listingPrice.toLocaleString()}`);
      if (knownData.tireLifeLeft !== null) knownFields.push(`- Tires have life left: ${knownData.tireLifeLeft ? 'Yes' : 'No'}`);
      if (knownData.titleStatus) {
        const titleDisplay = knownData.titleStatus === 'check_carfax' ? 'Check Carfax (link provided)' : knownData.titleStatus;
        knownFields.push(`- Title status: ${titleDisplay}`);
      }
      if (knownData.carfaxDamageIncidents !== null) {
        const carfaxDisplay = knownData.carfaxDamageIncidents === 'yes' ? 'Yes' : 
                             knownData.carfaxDamageIncidents === 'no' ? 'No' : 
                             knownData.carfaxDamageIncidents === 'unsure' ? 'Unsure' :
                             knownData.carfaxDamageIncidents === 'check_carfax' ? 'Check Carfax (link provided)' : 'Unknown';
        knownFields.push(`- Carfax damage incidents: ${carfaxDisplay}`);
      }
      if (knownData.docFeeQuoted !== null) knownFields.push(`- Doc fee quoted: $${knownData.docFeeQuoted.toLocaleString()}`);
      if (knownData.docFeeNegotiable !== null) knownFields.push(`- Doc fee negotiable: ${knownData.docFeeNegotiable ? 'Yes' : 'No'}`);
      if (knownData.docFeeAgreed !== null) knownFields.push(`- Doc fee agreed: $${knownData.docFeeAgreed.toLocaleString()}`);
      if (knownData.lowestPrice !== null) knownFields.push(`- Lowest price: $${knownData.lowestPrice.toLocaleString()}`);
      
      if (knownFields.length > 0) {
        knownInfoSection = `\n\nKnown information:\n${knownFields.join('\n')}`;
      }
    }

    const prompt = `Does this dealer message contain NEW information about the car (make, model, year, miles, price, tire condition, title status, carfax, doc fee, etc.) that is not already known?${knownInfoSection}

Dealer message: "${message}"

Respond with ONLY "YES" if the message contains new information (like specific numbers, prices, details about the car, etc.), or "NO" if it's just an acknowledgment, confirmation, or promise to get back later.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that determines if a message contains new information.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase();
    return response === 'YES';
  } catch (error) {
    console.error('Error checking for new information:', error.message);
    // On error, assume it might have info to be safe
    return true;
  }
}

// Helper function to get AI agent response using GPT-4o
// Returns: { message: string, newState: 'default'|'waiting'|'complete', questionAsked: string|null }
async function getAIResponse(conversationTranscript, conversationState = 'default', lastQuestionAsked = null, questionRepeatCount = 0) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Build state context section
  let stateContextSection = '';
  if (conversationState === 'waiting') {
    stateContextSection = `\n\nCURRENT STATE: You are in "waiting" state. The dealer has not yet provided all necessary information. You last asked: "${lastQuestionAsked || 'unknown'}". If the dealer's message provides the information you last asked for, you should respond normally and the state will return to "default". If they still haven't provided it, either do not respond, or say "Thanks, I'll wait until I've received more info" and return '# WAITING #'.`;
  } else if (conversationState === 'complete') {
    stateContextSection = `\n\nCURRENT STATE: Conversation is complete. You should not respond to further messages. Return '# NO_RESPONSE #'.`;
  } else {
    // default state
    if (lastQuestionAsked && questionRepeatCount >= 2) {
      // We've already asked twice (first attempt + one repeat), if still no answer, go to waiting
      stateContextSection = `\n\nCURRENT STATE: You are in "default" state. You have asked "${lastQuestionAsked}" ${questionRepeatCount} time(s) (first attempt + ${questionRepeatCount - 1} repeat(s)). If the dealer's message still doesn't provide this information, return '# WAITING #' to shift to waiting state.`;
    } else if (lastQuestionAsked && questionRepeatCount === 1) {
      // We've asked once and repeated once, this is the second attempt
      stateContextSection = `\n\nCURRENT STATE: You are in "default" state. You have asked "${lastQuestionAsked}" ${questionRepeatCount + 1} time(s) total. If the dealer's message still doesn't provide this information, you should ask one more time. If after this third attempt they still don't provide it, return '# WAITING #' to shift to waiting state.`;
    }
  }

  const systemPrompt = `You are an expert used car buyer. You are in a conversation with a used car dealer, who is selling a car that you indicated interest in online.

Your task is to get the following pieces of information from the dealer:
1. Car make
2. Car model
3. Car year
4. Number of miles on the car
5. Listing price
6. Whether the tires have life left (yes or no)
7. Is it a clean title or rebuilt title (clean or rebuilt)
8. Does the carfax show any prior damage incidents (yes or no)
9. Doc fee amount (the amount they quote)
10. Whether the doc fee is negotiable (yes or no)
11. Doc fee agreed upon (after negotiation, if applicable)
12. Lowest price dealer will accept${stateContextSection}

Guidelines:
1. Maintain a professional, but not overly friendly tone. Do not sound too robotic - you are impersonating a human who is a savvy used car buyer. Do not use perfect punctuation (e.g., 'Can you remind me the car make/model and year? Appreciate it').
2. Try to obtain the pieces of information above in order (e.g., don't ask for the age of the tires before you know the car's make)
3. Where it makes sense, I would ask for the car make, model, year and number of miles in one message
4. Once you have all information from items 1-9 (make, model, year, miles, listing price, tire life status, title status, carfax damage incidents, and doc fee quoted), ask about item 10 (whether the doc fee is negotiable). 
   If the doc fee is negotiable and greater than $150, try to negotiate a lower doc fee. Then negotiate the listing price. If the tires do not have life left, if it's a rebuilt title, and/or if there are carfax damage incidents, mention those as reasons why you are trying to negotiate. 
   Do not attempt an unreasonable amount of negotiation - if the dealer is not willing to negotiate, move on to the next question. If they lower the price more than 10% from the listing price, accept the deal. After negotiation, record the final agreed-upon doc fee in item 11. Make sure to thank the dealer for each concession they make.
5. DO NOT ask for information you already have. Review the conversation transcript to see what information has already been provided.
6. URL HANDLING: If the dealer sends a URL or link, you cannot access it. Include in your response something like "For some reason I'm unable to see the link. Could you tell me [the information you need]?" Do not mention that you're an AI or automated system.
7. If the dealer indicates that they have sent a link to the carfax (whether in the thread or in a separate message), do not continue asking for the carfax, and just make the values for 7 and 8 'check_carfax'.
8. STATE MANAGEMENT:
   - State transitions follow these rules:
     * default -> waiting: After asking for information twice (first attempt + one repeat), if the dealer still doesn't provide it, return '# WAITING #'
     * default -> complete: When you have received all required information (items 1-12), return '# CONVO COMPLETE #'
     * waiting -> default: If the dealer provides the information you last asked for, respond normally (state will return to default)
     * waiting -> complete: If the dealer provides the information you last asked for AND that was the last piece needed, return '# CONVO COMPLETE #'
   - When returning special state markers, format your response as: "[your message if any]# [STATE_MARKER] #" where STATE_MARKER is either WAITING or CONVO COMPLETE.

Return format:
- Normal response: Just return the message text
- Entering waiting state: Return your message (if any) followed by "# WAITING #"
- Conversation complete: Return "# CONVO COMPLETE #"
- No response needed (complete state): Return "# NO_RESPONSE #"

After your message, if you asked a question, also include "# QUESTION: [brief description of what you asked]" to help track what information you're requesting.`;

  const userPrompt = `Here is the transcript of the conversation so far:

${conversationTranscript || '(No conversation yet)'}

Please output what you think your next message to the dealer should be.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 250
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the response to extract state markers and question asked
    let message = response;
    let newState = conversationState;
    let questionAsked = null;

    // Check for state markers
    if (response.includes('# CONVO COMPLETE #')) {
      newState = 'complete';
      message = response.replace(/# CONVO COMPLETE #/g, '').trim();
    } else if (response.includes('# WAITING #')) {
      newState = 'waiting';
      message = response.replace(/# WAITING #/g, '').trim();
    } else if (response.includes('# NO_RESPONSE #')) {
      newState = 'complete';
      message = null; // No message to send
    }

    // Extract question asked if present
    const questionMatch = response.match(/# QUESTION:\s*(.+?)(?:\s*#|$)/i);
    if (questionMatch) {
      questionAsked = questionMatch[1].trim();
      message = message ? message.replace(/# QUESTION:.*/i, '').trim() : null;
    }

    // If no question marker but we're asking something, try to infer from message
    if (!questionAsked && message && conversationState === 'default' && !message.includes('#')) {
      // Simple heuristic: if message ends with ?, it's likely a question
      if (message.trim().endsWith('?')) {
        questionAsked = message.trim();
      }
    }

    return {
      message: message || null,
      newState: newState,
      questionAsked: questionAsked
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error.message);
    throw error;
  }
}

// Helper function to send SMS via Mobile Text Alerts with retry logic
async function sendSMS(to, message, retries = 3) {
  if (!MTA_API_KEY) {
    throw new Error('MTA_API_KEY is not configured');
  }

  const payload = {
    subscribers: [to],
    message: message,
    longcodeId: MTA_LONGCODE_ID // Specify the longcode ID to use the verified number
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Sending message (attempt ${attempt}/${retries}):`, message);

      if (attempt > 1) {
        console.log('Sending payload:', JSON.stringify(payload, null, 2));
      }
      
      const response = await axios.post(
        `${MTA_API_BASE_URL}/send`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${MTA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      return response.data;
    } catch (error) {
      const isNetworkError = error.code === 'ENOTFOUND' || 
                            error.code === 'ECONNREFUSED' || 
                            error.code === 'ETIMEDOUT' ||
                            error.message?.includes('getaddrinfo');
      
      if (isNetworkError && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5 seconds
        console.warn(`Network error on attempt ${attempt}, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last attempt or not a network error, throw
      console.error('Error sending SMS via Mobile Text Alerts:', error.response?.data || error.message);
      if (attempt === 1) {
        console.error('Request payload was:', JSON.stringify(payload, null, 2));
      }
      throw error;
    }
  }
}

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Allow all origins in development, specific URL in production
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/car_scout';

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  console.log('Server will continue without MongoDB connection');
});

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: 'Car Scout API is running' });
});

// Test MongoDB connection
app.get('/api/test-db', (req, res) => {
  const connectionState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const stateName = states[connectionState] || 'unknown';
  const isConnected = connectionState === 1;

  res.json({
    connected: isConnected,
    state: stateName,
    readyState: connectionState,
    message: isConnected 
      ? 'MongoDB connection is active!' 
      : `MongoDB connection is ${stateName}. Check your MONGODB_URI in .env file.`
  });
});

// Helper endpoint to list available templates
app.get('/api/templates', async (req, res) => {
  try {
    if (!MTA_API_KEY) {
      return res.status(500).json({ error: 'MTA_API_KEY is not configured in environment variables' });
    }

    const response = await axios.get(
      `${MTA_API_BASE_URL}/templates`,
      {
        headers: {
          'Authorization': `Bearer ${MTA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      templates: response.data
    });
  } catch (error) {
    console.error('Error fetching templates:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error.response?.data || error.message
    });
  }
});

// Helper endpoint to register webhook with Mobile Text Alerts
app.post('/api/register-webhook', async (req, res) => {
  try {
    if (!MTA_API_KEY) {
      return res.status(500).json({ error: 'MTA_API_KEY is not configured in environment variables' });
    }

    const { webhookUrl, secret, alertEmail } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const response = await axios.post(
      `${MTA_API_BASE_URL}/webhooks`,
      {
        event: 'message-reply',
        url: webhookUrl,
        secret: secret || process.env.MTA_WEBHOOK_SECRET || 'your-secret-key',
        alertEmail: alertEmail || process.env.MTA_ALERT_EMAIL || ''
      },
      {
        headers: {
          'Authorization': `Bearer ${MTA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'Webhook registered successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Error registering webhook:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to register webhook',
      details: error.response?.data || error.message
    });
  }
});

// Mobile Text Alerts webhook endpoint to receive incoming messages
app.post('/api/webhook/sms', async (req, res) => {
  try {
    // Mobile Text Alerts webhook payload structure:
    // { fromNumber, toNumber, message, replyId, timestamp, tags }
    const { fromNumber, toNumber, message, replyId, timestamp, tags } = req.body;

    // Extract message body and sender info
    const senderPhone = fromNumber;
    const recipientPhone = toNumber;
    const messageBody = message;

    // Validate required fields
    if (!senderPhone || !messageBody) {
      console.error('Missing required fields in webhook request:', req.body);
      return res.status(400).json({ error: 'Missing required fields', received: req.body });
    }

    // Filter out Mobile Text Alerts automatic opt-in messages
    const optInMessagePattern = /Thanks for opting in to receive messages from us!/i;
    if (optInMessagePattern.test(messageBody)) {
      console.log('⚠️  Ignoring Mobile Text Alerts automatic opt-in message');
      return res.status(200).json({ success: true, message: 'Opt-in message ignored' });
    }

    // Find or create thread for this phone number
    let thread = await Thread.findOne({ phoneNumber: senderPhone });
    
    if (!thread) {
      thread = new Thread({
        phoneNumber: senderPhone,
        lastMessage: messageBody,
        lastMessageTime: timestamp ? new Date(timestamp) : new Date(),
        unreadCount: 1
      });
      await thread.save();
    } else {
      thread.lastMessage = messageBody;
      thread.lastMessageTime = timestamp ? new Date(timestamp) : new Date();
      thread.unreadCount += 1;
      await thread.save();
    }

    // Save incoming message
    const incomingMessage = new Message({
      threadId: thread._id,
      from: senderPhone,
      to: recipientPhone || 'unknown',
      body: messageBody,
      direction: 'inbound',
      externalMessageId: replyId || (tags?.messageId) || null
    });
    await incomingMessage.save();

    // Initialize conversation state if not set (for existing threads)
    if (!thread.conversationState) {
      if (thread.conversationComplete) {
        thread.conversationState = 'complete';
      } else if (thread.waitingForDealerResponse) {
        thread.conversationState = 'waiting';
      } else {
        thread.conversationState = 'default';
      }
      await thread.save();
    }

    // Check if conversation is already complete - if so, don't respond
    if (thread.conversationState === 'complete') {
      console.log('ℹ️  Conversation already complete, not generating response');
      return res.status(200).json({ success: true, message: 'Conversation complete, no response sent' });
    }

    // Handle state transitions from waiting state
    if (thread.conversationState === 'waiting') {
      console.log(`ℹ️  Currently in waiting state. Last question asked: "${thread.lastQuestionAsked || 'unknown'}"`);
      
      // Check if the message contains new information that answers the last question
      const hasNewInfo = await messageContainsNewInformation(messageBody, null);
      
      if (!hasNewInfo) {
        console.log('ℹ️  Message is just an acknowledgment, not responding');
        return res.status(200).json({ success: true, message: 'Waiting for dealer response, no new information in message' });
      } else {
        console.log('✅ Message contains new information, transitioning from waiting to default');
        // Transition from waiting -> default (or complete if this was the last piece needed)
        // The AI will determine if we should go to complete or stay in default
        thread.conversationState = 'default';
        // Reset question tracking since we got a response
        thread.lastQuestionAsked = null;
        thread.questionRepeatCount = 0;
        await thread.save();
      }
    }

    // Cancel any pending response for this thread if a new message arrived
    const threadIdString = thread._id.toString();
    if (pendingResponses.has(threadIdString)) {
      const pendingTimeout = pendingResponses.get(threadIdString);
      clearTimeout(pendingTimeout.timeoutId);
      pendingResponses.delete(threadIdString);
      console.log('⚠️  Cancelled pending response due to new message');
    }

    // Generate AI agent response using GPT-4o
    try {
      // Build conversation transcript
      const transcript = await buildConversationTranscript(thread._id);
      console.log('Conversation transcript:', transcript);

      // Get AI response with state management
      const aiResponseResult = await getAIResponse(
        transcript, 
        thread.conversationState || 'default',
        thread.lastQuestionAsked,
        thread.questionRepeatCount || 0
      );
      console.log('AI agent response result:', aiResponseResult);

      // Handle state transitions and response
      const newState = aiResponseResult.newState;
      const responseMessage = aiResponseResult.message;
      const questionAsked = aiResponseResult.questionAsked;

      // Update state and question tracking
      if (newState !== thread.conversationState) {
        console.log(`🔄 State transition: ${thread.conversationState} -> ${newState}`);
        thread.conversationState = newState;
      }

      // Update question tracking
      if (questionAsked) {
        // Check if this is the same question as before
        if (thread.lastQuestionAsked === questionAsked) {
          thread.questionRepeatCount = (thread.questionRepeatCount || 0) + 1;
          console.log(`📝 Repeated question "${questionAsked}" (count: ${thread.questionRepeatCount})`);
        } else {
          thread.lastQuestionAsked = questionAsked;
          thread.questionRepeatCount = 1;
          console.log(`📝 New question asked: "${questionAsked}"`);
        }
      } else {
        // If no question asked, reset tracking (dealer provided info)
        if (thread.conversationState === 'waiting' && newState === 'default') {
          thread.lastQuestionAsked = null;
          thread.questionRepeatCount = 0;
        }
      }

      // Handle complete state
      if (newState === 'complete') {
        console.log('✅ Conversation marked as complete by AI agent');
        
        // Send thank you message to dealer
        const thankYouMessage = "Thanks - this sounds like a great option for me, let me get back to you";
        try {
          await sendSMS(senderPhone, thankYouMessage);
          
          // Save the thank you message
          const thankYouMsg = new Message({
            threadId: thread._id,
            from: MTA_PHONE_NUMBER,
            to: senderPhone,
            body: thankYouMessage,
            direction: 'outbound'
          });
          await thankYouMsg.save();
          
          console.log('✅ Thank you message sent to dealer');
        } catch (sendError) {
          console.error('Error sending thank you message:', sendError.message);
          // Continue with saving data even if message send fails
        }
        
        // Mark thread as complete (legacy field for backwards compatibility)
        thread.conversationComplete = true;
        thread.lastMessage = thankYouMessage;
        thread.lastMessageTime = new Date();
        await thread.save();
        
        // Extract and save car listing data
        try {
          const extractedData = await extractCarListingData(transcript);
          console.log('Extracted car listing data:', extractedData);

          // Check if car listing already exists for this thread
          let carListing = await CarListing.findOne({ threadId: thread._id });
          
          if (carListing) {
            // Update existing listing
            Object.assign(carListing, extractedData);
            carListing.conversationComplete = true;
            await carListing.save();
            console.log('✅ Updated existing car listing');
          } else {
            // Create new listing
            carListing = new CarListing({
              threadId: thread._id,
              phoneNumber: senderPhone,
              ...extractedData,
              conversationComplete: true
            });
            await carListing.save();
            console.log('✅ Saved car listing data to MongoDB');
          }
        } catch (extractError) {
          console.error('Error extracting/saving car listing data:', extractError.message);
          // Continue even if extraction fails
        }
        
        return res.status(200).json({ success: true, message: 'Conversation complete' });
      }

      // Handle waiting state
      if (newState === 'waiting') {
        console.log('✅ Agent entering waiting state');
        
        // Send message if provided, otherwise send default waiting message
        const waitingMessage = responseMessage || "Thanks, I'll wait until I've received more info";
        
        try {
          await sendSMS(senderPhone, waitingMessage);
          
          // Save the waiting message
          const waitingMsg = new Message({
            threadId: thread._id,
            from: MTA_PHONE_NUMBER,
            to: senderPhone,
            body: waitingMessage,
            direction: 'outbound'
          });
          await waitingMsg.save();
          
          thread.lastMessage = waitingMessage;
          thread.lastMessageTime = new Date();
          await thread.save();
          
          console.log('✅ Waiting message sent');
        } catch (sendError) {
          console.error('Error sending waiting message:', sendError.message);
        }
        
        return res.status(200).json({ success: true, message: 'Entered waiting state' });
      }

      // Handle no response case (shouldn't happen in default state, but handle gracefully)
      if (!responseMessage) {
        console.log('ℹ️  No response message to send');
        await thread.save();
        return res.status(200).json({ success: true, message: 'No response generated' });
      }

      // Normal response - schedule to send
      const delayMs = Math.floor(Math.random() * 0) + 0; 
      console.log(`⏱️  Scheduling response to be sent in ${Math.round(delayMs / 1000)} seconds`);

      const timeoutId = setTimeout(async () => {
        try {
          // Check if this response was cancelled (another message arrived and replaced this one)
          const pendingResponse = pendingResponses.get(threadIdString);
          if (!pendingResponse || pendingResponse.timeoutId !== timeoutId) {
            console.log('⚠️  Response cancelled, not sending');
            return;
          }

          // Send AI-generated response
          await sendSMS(senderPhone, responseMessage);

          // Save outbound AI response message
          const replyMessage = new Message({
            threadId: thread._id,
            from: MTA_PHONE_NUMBER,
            to: senderPhone,
            body: responseMessage,
            direction: 'outbound'
          });
          await replyMessage.save();

          // Update thread with the reply
          thread.lastMessage = responseMessage;
          thread.lastMessageTime = new Date();
          await thread.save();

          // Remove from pending responses
          pendingResponses.delete(threadIdString);
          
          console.log('✅ AI agent response sent successfully');
        } catch (sendError) {
          // Remove from pending responses even on error
          pendingResponses.delete(threadIdString);
          
          // Handle errors gracefully
          if (sendError.message?.includes('OPENAI_API_KEY')) {
            console.error('Error: OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.');
          } else if (sendError.response?.data?.httpCode === 403 && 
              sendError.response?.data?.message?.includes('Unverified accounts')) {
            console.warn('⚠️  AI response skipped: Account verification required.');
            console.warn('   Unverified accounts cannot send messages.');
            console.warn('   Please verify your Mobile Text Alerts account.');
            console.warn('   Contact Mobile Text Alerts support to verify your account.');
            console.warn('   Incoming messages will still be saved and displayed.');
          } else {
            console.error('Error sending AI agent response:', sendError.response?.data || sendError.message);
          }
        }
      }, delayMs);

      // Store the timeout ID so it can be cancelled if a new message arrives
      pendingResponses.set(threadIdString, { timeoutId, aiResponse: responseMessage });
      
      // Save thread state updates
      await thread.save();
    } catch (replyError) {
      // Handle errors gracefully
      if (replyError.message?.includes('OPENAI_API_KEY')) {
        console.error('Error: OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.');
      } else if (replyError.response?.data?.httpCode === 403 && 
          replyError.response?.data?.message?.includes('Unverified accounts')) {
        console.warn('⚠️  AI response skipped: Account verification required.');
        console.warn('   Unverified accounts cannot send messages.');
        console.warn('   Please verify your Mobile Text Alerts account.');
        console.warn('   Contact Mobile Text Alerts support to verify your account.');
        console.warn('   Incoming messages will still be saved and displayed.');
      } else {
        console.error('Error generating AI agent response:', replyError.response?.data || replyError.message);
      }
      // Continue processing even if AI response fails
    }

    // Respond to Mobile Text Alerts webhook
    res.status(200).json({ success: true, message: 'Message processed' });
  } catch (error) {
    console.error('Error processing incoming SMS:', error);
    res.status(500).json({ error: 'Error processing message' });
  }
});

// Get all text threads
app.get('/api/threads', async (req, res) => {
  try {
    const threads = await Thread.find()
      .sort({ lastMessageTime: -1 })
      .exec();
    
    res.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// Get messages for a specific thread
app.get('/api/threads/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    // Verify thread exists
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get all messages for this thread
    const messages = await Message.find({ threadId })
      .sort({ timestamp: 1 })
      .exec();

    // Mark thread as read
    thread.unreadCount = 0;
    await thread.save();

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all car listings
app.get('/api/car-listings', async (req, res) => {
  try {
    // Check if MongoDB is connected before querying
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB not connected, cannot fetch car listings');
      return res.status(503).json({ 
        error: 'Database unavailable', 
        message: 'MongoDB connection is not active. Please check your connection string and network connectivity.' 
      });
    }

    // Support filtering by reviewed status
    const { reviewed } = req.query;
    let query = {};
    
    if (reviewed === 'true') {
      query.reviewed = true;
    } else if (reviewed === 'false') {
      query.reviewed = false;
    }
    // If reviewed is not provided or is 'all', don't filter by reviewed status

    const listings = await CarListing.find(query)
      .populate('threadId')
      .sort({ extractedAt: -1 })
      .exec();
    
    res.json(listings);
  } catch (error) {
    // Only log full error details once, then suppress repeated errors
    if (!error._logged) {
      console.error('Error fetching car listings:', error.message || error);
      if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
        console.error('MongoDB connection issue. Check your MONGODB_URI and network connectivity.');
      }
      error._logged = true;
    }
    res.status(500).json({ 
      error: 'Failed to fetch car listings',
      message: error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError' 
        ? 'Database connection error. Please try again later.' 
        : 'An error occurred while fetching listings.'
    });
  }
});

// Get car listing for a specific thread
app.get('/api/threads/:threadId/car-listing', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const carListing = await CarListing.findOne({ threadId })
      .populate('threadId')
      .exec();
    
    if (!carListing) {
      return res.status(404).json({ error: 'Car listing not found for this thread' });
    }

    res.json(carListing);
  } catch (error) {
    console.error('Error fetching car listing:', error);
    res.status(500).json({ error: 'Failed to fetch car listing' });
  }
});

// Update reviewed status for a car listing
app.patch('/api/car-listings/:listingId/reviewed', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { reviewed } = req.body;

    if (typeof reviewed !== 'boolean') {
      return res.status(400).json({ error: 'reviewed must be a boolean value' });
    }

    const carListing = await CarListing.findByIdAndUpdate(
      listingId,
      { reviewed },
      { new: true }
    );

    if (!carListing) {
      return res.status(404).json({ error: 'Car listing not found' });
    }

    res.json(carListing);
  } catch (error) {
    console.error('Error updating reviewed status:', error);
    res.status(500).json({ error: 'Failed to update reviewed status' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or change PORT in .env`);
    process.exit(1);
  } else {
    throw err;
  }
});

