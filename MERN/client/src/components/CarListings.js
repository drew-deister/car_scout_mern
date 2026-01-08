import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CarListings.css';

const CarListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:5001/api';

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/car-listings`);
        const data = await response.json();
        // Filter out listings without miles or listingPrice
        const validListings = data.filter(
          listing => listing.miles !== null && listing.listingPrice !== null
        );
        setListings(validListings);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching car listings:', error);
        setLoading(false);
      }
    };

    fetchListings();
    // Poll for new listings every 10 seconds
    const interval = setInterval(fetchListings, 10000);
    return () => clearInterval(interval);
  }, []);

  // Transform data for scatterplot
  const scatterData = listings.map((listing, index) => ({
    x: listing.miles,
    y: listing.listingPrice,
    listing: listing,
    index: index
  }));

  // Custom tooltip to show full car data
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const listing = payload[0].payload.listing;
      return (
        <div className="custom-tooltip">
          <h4>Car Details</h4>
          <div className="tooltip-content">
            <p><strong>Make:</strong> {listing.make || 'N/A'}</p>
            <p><strong>Model:</strong> {listing.model || 'N/A'}</p>
            <p><strong>Year:</strong> {listing.year || 'N/A'}</p>
            <p><strong>Miles:</strong> {listing.miles ? listing.miles.toLocaleString() : 'N/A'}</p>
            <p><strong>Listing Price:</strong> {listing.listingPrice ? `$${listing.listingPrice.toLocaleString()}` : 'N/A'}</p>
            <p><strong>Tires Have Life Left:</strong> {listing.tireLifeLeft !== null ? (listing.tireLifeLeft ? 'Yes' : 'No') : 'N/A'}</p>
            <p><strong>Title Status:</strong> {listing.titleStatus ? listing.titleStatus.charAt(0).toUpperCase() + listing.titleStatus.slice(1) : 'N/A'}</p>
            <p><strong>Carfax Damage Incidents:</strong> {listing.carfaxDamageIncidents !== null ? (listing.carfaxDamageIncidents ? 'Yes' : 'No') : 'N/A'}</p>
            <p><strong>Doc Fee Quoted:</strong> {listing.docFeeQuoted ? `$${listing.docFeeQuoted.toLocaleString()}` : 'N/A'}</p>
            <p><strong>Doc Fee Negotiable:</strong> {listing.docFeeNegotiable !== null ? (listing.docFeeNegotiable ? 'Yes' : 'No') : 'N/A'}</p>
            <p><strong>Doc Fee Agreed:</strong> {listing.docFeeAgreed ? `$${listing.docFeeAgreed.toLocaleString()}` : 'N/A'}</p>
            <p><strong>Lowest Price:</strong> {listing.lowestPrice ? `$${listing.lowestPrice.toLocaleString()}` : 'N/A'}</p>
            <p><strong>Phone:</strong> {listing.phoneNumber || 'N/A'}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="car-listings-container">
        <div className="car-listings-loading">Loading car listings...</div>
      </div>
    );
  }

  return (
    <div className="car-listings-container">
      <div className="car-listings-header">
        <h1>Car Listings</h1>
        <p className="listings-count">{listings.length} car listing{listings.length !== 1 ? 's' : ''}</p>
      </div>

      {listings.length === 0 ? (
        <div className="no-listings">
          <p>No car listings yet. Complete conversations to see listings here.</p>
        </div>
      ) : (
        <div className="scatterplot-container">
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Miles"
                label={{ value: 'Number of Miles', position: 'insideBottom', offset: -10 }}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Price"
                label={{ value: 'Listing Price ($)', angle: -90, position: 'insideLeft' }}
                domain={['dataMin - 500', 'dataMax + 500']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Cars" data={scatterData} fill="#007bff">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#007bff" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CarListings;

