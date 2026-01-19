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
npm run dev
```

4. Start ngrok
```bash
ngrok http 5001
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
8. Doc fee amount


to add:
- come in person to negotiate, defer to sales team
- handle images
- multiple cars mentioned
- accessing links
- dont keep negotiating after theyve already gone down (913 733 1294)


conversation states:
- default: continue conversation as usual 
- waiting - has not yet provided all necessary information: either do not respond with anything, or say Thanks, I'll wait until I've received more info
- complete - received all necessary information: do not respond to further messages

state change instruction:
- default -> waiting - has not yet provided all necessary information: shift after the first repeat attempt at getting a piece of information (e.g., if you asked for whether the title is clean or rebuilt, and they don't sufficiently answer, ask once more, and if they still don't respond, shift to the waiting state) 
- default -> complete - received all necessary information: shift when all information has been received
- waiting - has not yet provided all necessary information -> default: if the dealer provides the information last asked for, then shift back to default mode
- waiting - has not yet provided all necessary information -> complete: if the dealer provides the information last asked for, and that piece of information was the last piece needed
- complete - received all necessary information -> default: not allowed, once complete the conversation is complete
- complete - received all necessary information -> waiting - has not yet provided all necessary information: not allowed, once complete the conversation is complete



https://us-east-1.console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/application/overview?applicationName=car-scout-backend-updated

https://us-east-1.console.aws.amazon.com/amplify/apps/d332af70aoica8/branches/main/deployments