const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
require('dotenv').config();

// Import models
const Thread = require('./models/Thread');
const Message = require('./models/Message');
const CarListing = require('./models/CarListing');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Helper function to extract URLs from text
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  return urls || [];
}

// Helper function to scrape web page and extract car information
async function scrapeAndExtractCarData(url) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    console.log(`Scraping URL: ${url}`);
    
    // Fetch the web page
    const pageResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(pageResponse.data);
    
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Extract text content
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Limit text length to avoid token limits (keep first 8000 characters)
    const limitedText = pageText.substring(0, 8000);

    // Use GPT-4o to extract car information from the scraped content
    const extractionPrompt = `Extract car listing information from this web page content. Return ONLY a JSON object with the extracted data. If information is not available, use null. Make sure numbers are actual numbers, not strings.

Required fields:
- make: string (car make, e.g., "Toyota", "Honda")
- model: string (car model, e.g., "Camry", "Civic")
- year: number (car year, e.g., 2020)
- miles: number (number of miles, e.g., 50000)
- listingPrice: number (listing price in dollars, e.g., 15000)
- tireAge: number (age of tires in years, e.g., 2) - if not mentioned, use null
- lowestPrice: number (lowest price dealer will accept in dollars) - if not mentioned, use null
- dockFee: number (dock fee amount in dollars) - if not mentioned, use null

Web page content:
${limitedText}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "make": "string or null",
  "model": "string or null",
  "year": number or null,
  "miles": number or null,
  "listingPrice": number or null,
  "tireAge": number or null,
  "lowestPrice": number or null,
  "dockFee": number or null
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a data extraction assistant. Extract structured car listing data from web pages and return only valid JSON.' },
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
      tireAge: data.tireAge !== null && data.tireAge !== undefined ? Number(data.tireAge) : null,
      lowestPrice: data.lowestPrice !== null && data.lowestPrice !== undefined ? Number(data.lowestPrice) : null,
      dockFee: data.dockFee !== null && data.dockFee !== undefined ? Number(data.dockFee) : null,
      url: url,
      extractedAt: new Date()
    };

    console.log('Extracted data from URL:', extractedData);
    return extractedData;
  } catch (error) {
    console.error('Error scraping URL:', error.message);
    throw error;
  }
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
- tireAge: number (age of tires in years, e.g., 2)
- lowestPrice: number (lowest price dealer will accept in dollars, e.g., 14000)
- dockFee: number (dock fee amount in dollars, e.g., 500)

Conversation transcript:
${conversationTranscript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "make": "string or null",
  "model": "string or null",
  "year": number or null,
  "miles": number or null,
  "listingPrice": number or null,
  "tireAge": number or null,
  "lowestPrice": number or null,
  "dockFee": number or null
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
      tireAge: data.tireAge !== null && data.tireAge !== undefined ? Number(data.tireAge) : null,
      lowestPrice: data.lowestPrice !== null && data.lowestPrice !== undefined ? Number(data.lowestPrice) : null,
      dockFee: data.dockFee !== null && data.dockFee !== undefined ? Number(data.dockFee) : null
    };

    return extractedData;
  } catch (error) {
    console.error('Error extracting car listing data:', error.message);
    throw error;
  }
}

// Helper function to get AI agent response using GPT-4o
async function getAIResponse(conversationTranscript, knownData = null) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Build known information section
  let knownInfoSection = '';
  if (knownData) {
    const knownFields = [];
    if (knownData.make) knownFields.push(`- Car make: ${knownData.make}`);
    if (knownData.model) knownFields.push(`- Car model: ${knownData.model}`);
    if (knownData.year) knownFields.push(`- Car year: ${knownData.year}`);
    if (knownData.miles !== null) knownFields.push(`- Number of miles: ${knownData.miles.toLocaleString()}`);
    if (knownData.listingPrice !== null) knownFields.push(`- Listing price: $${knownData.listingPrice.toLocaleString()}`);
    if (knownData.tireAge !== null) knownFields.push(`- Tire age: ${knownData.tireAge} years`);
    if (knownData.lowestPrice !== null) knownFields.push(`- Lowest price: $${knownData.lowestPrice.toLocaleString()}`);
    if (knownData.dockFee !== null) knownFields.push(`- Dock fee: $${knownData.dockFee.toLocaleString()}`);
    
    if (knownFields.length > 0) {
      knownInfoSection = `\n\nIMPORTANT: You already have the following information (do NOT ask for these again):\n${knownFields.join('\n')}\n\nOnly ask for information you don't already have.`;
    }
  }

  const systemPrompt = `You are an expert used car buyer. You are in a conversation with a used car dealer, who is selling a car that you indicated interest in online.

Your task is to get the following pieces of information from the dealer:
1. Car make
2. Car model
3. Car year
4. Number of miles on the car
5. Listing price
6. Age of tires
7. Dock fee amount
8. Lowest price dealer will accept${knownInfoSection}

Guidelines:
1. Maintain a professional, but not overly friendly tone. Do not sound too robotic - you are impersonating a human who is a savvy used car buyer. Do not use perfect punctuation (e.g., 'Can you remind me the car make/model and year? Appreciate it').
2. Try to obtain the pieces of information above in order (e.g., don't ask for the age of the tires before you know the car's make)
3. Where it makes sense, I would ask for the car make, model, year and number of miles in one message
4. Once you have all information from items 1-7 (make, model, year, miles, listing price, tire age, and dock fee) begin negotiating a better deal. Do this buy trying to lower either the dock fee (if greater than $200) and/or the listing price. If the tires are five or more years old, mention that as a reason why you are trying to negotiate. Do not attempt an unreasonable amount of negotiation - if the dealer is not willing to negotiate, move on to the next question. If they lower the price more than 15% from the listing price, accept the deal.
5. DO NOT ask for information you already have. If you already know the make, model, year, miles, or listing price, skip asking for those and move on to information you don't have.

Return nothing but the message you would like to send the dealer. If you believe you have captured all of the information above, simply return '# CONVO COMPLETE #'.`;

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
      max_tokens: 200
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return response;
  } catch (error) {
    console.error('Error calling OpenAI:', error.message);
    throw error;
  }
}

// Helper function to send SMS via Mobile Text Alerts
async function sendSMS(to, message) {
  if (!MTA_API_KEY) {
    throw new Error('MTA_API_KEY is not configured');
  }

  const payload = {
    subscribers: [to],
    message: message,
    longcodeId: MTA_LONGCODE_ID // Specify the longcode ID to use the verified number
  };

  try {
    console.log('Sending message:', message);

    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    const response = await axios.post(
      `${MTA_API_BASE_URL}/send`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${MTA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending SMS via Mobile Text Alerts:', error.response?.data || error.message);
    console.error('Request payload was:', JSON.stringify(payload, null, 2));
    throw error;
  }
}

// Middleware
app.use(cors());
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

    // Check for URLs in the message and scrape if found
    const urls = extractUrls(messageBody);
    if (urls.length > 0) {
      console.log(`Found ${urls.length} URL(s) in message:`, urls);
      
      // Scrape the first URL (you can modify to handle multiple URLs)
      try {
        const extractedData = await scrapeAndExtractCarData(urls[0]);
        
        // Store extracted data in thread
        thread.extractedUrlData = extractedData;
        await thread.save();
        
        console.log('✅ Extracted and stored data from URL:', extractedData);
      } catch (scrapeError) {
        console.error('Error scraping URL:', scrapeError.message);
        // Continue even if scraping fails
      }
    }

    // Generate AI agent response using GPT-4o
    try {
      // Build conversation transcript
      const transcript = await buildConversationTranscript(thread._id);
      console.log('Conversation transcript:', transcript);

      // Get known data from thread (from URL scraping or previous extractions)
      const knownData = thread.extractedUrlData || null;

      // Get AI response (pass known data so agent doesn't ask for info it already has)
      const aiResponse = await getAIResponse(transcript, knownData);
      console.log('AI agent response:', aiResponse);

      // Check if conversation is complete
      if (aiResponse === '# CONVO COMPLETE #') {
        console.log('✅ Conversation marked as complete by AI agent');
        
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
        
        // Don't send a message, conversation is complete
      } else {
        // Send AI-generated response
        await sendSMS(senderPhone, aiResponse);

        // Save outbound AI response message
        const replyMessage = new Message({
          threadId: thread._id,
          from: MTA_PHONE_NUMBER, // Your Mobile Text Alerts number
          to: senderPhone,
          body: aiResponse,
          direction: 'outbound'
        });
        await replyMessage.save();

        // Update thread with the reply
        thread.lastMessage = aiResponse;
        thread.lastMessageTime = new Date();
        await thread.save();
        
        console.log('✅ AI agent response sent successfully');
      }
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
        console.error('Error sending AI agent response:', replyError.response?.data || replyError.message);
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
    const listings = await CarListing.find()
      .populate('threadId')
      .sort({ extractedAt: -1 })
      .exec();
    
    res.json(listings);
  } catch (error) {
    console.error('Error fetching car listings:', error);
    res.status(500).json({ error: 'Failed to fetch car listings' });
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

