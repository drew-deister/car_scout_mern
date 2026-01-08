import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Scout from './components/Scout';
import CarListings from './components/CarListings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scout" element={<Scout />} />
            <Route path="/listings" element={<CarListings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
