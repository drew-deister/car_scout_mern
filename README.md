# Car Scout

A minimalistic and modern web application built with the MERN stack.

## Features

- Left sidebar navigation with Home and Scout options
- Clean, minimalistic design
- Responsive layout

## Tech Stack

- **MongoDB** - Database
- **Express** - Backend framework
- **React** - Frontend framework
- **Node.js** - Runtime environment

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install all dependencies (server and client):
```bash
npm run install-all
```

### Running the Application

1. Start both server and client concurrently:
```bash
npm run dev
```

Or run them separately:

2. Start the backend server:
```bash
npm run server
```

3. Start the frontend (in a new terminal):
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Environment Variables

Create a `.env` file in the `server` directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/car_scout
```

## Project Structure

```
car_scout/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       │   ├── Sidebar.js
│       │   ├── Home.js
│       │   └── Scout.js
│       ├── App.js
│       └── index.js
├── server/          # Express backend
│   ├── server.js
│   └── package.json
└── package.json     # Root package.json
```

Prompt:
You are an expert used car buyer. You are in a conversation with a used car dealer, who is selling a car that you indicated interest in online.

Your task is to get the following pieces of information from the dealer:
1. Car make
2. Car model
3. Car year
4. Number of miles on the car
5. Listing price
6. Age of tires
7. Lowest price dealer will accept
8. Dock fee amount

Here is the transcript of the conversation so far:
<>

Please output what you think your next message to the dealer should be. Guidelines:
1. Maintain a professional, but not overly friendly tone. Do not sound like a robot.
2. Try to obtain the pieces of information above in order (e.g., don't ask for the age of the tires before you know the car's make)
3. Where it makes sense, I would ask for the car make, model, year and number of miles in one message
4. Once you have the listing price, do some negotiation before finalizing 7 (lowest price dealer will accept) and 8 (dock fee). Specifically, propose lower purchase prices or dock fees. If the tires are five or more years old, mention that as a reason why you are trying to negotiate. Do not attempt an unreasonable amount of negotiation.
5. Do not sound too robotic - you are impersonating a human who is a savvy used car buyer. Do not use perfect punctuation.

Return nothing but the message you would like to send the dealer. If you believe you have captured all of the information above, simply return '# CONVO COMPLETE #'.

lsof -ti :5001 | xargs kill -9 2>/dev/null; sleep 1; lsof -ti :5001 || echo "Port 5001 is now free"