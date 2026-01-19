import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CarListings.css';

const CarListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewedFilter, setReviewedFilter] = useState('all'); // 'all', 'reviewed', 'not-reviewed'

  // Ensure API_BASE_URL ends with /api
  const getApiBaseUrl = () => {
    // Production backend URL (AWS Elastic Beanstalk)
    const productionUrl = 'http://car-scout-backend-updated-env.eba-2xmcecpg.us-east-1.elasticbeanstalk.com/api';
    const envUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? productionUrl : 'http://localhost:5001/api');
    // If it doesn't end with /api, add it
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  };
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Build query string based on filter
        let url = `${API_BASE_URL}/car-listings`;
        if (reviewedFilter === 'reviewed') {
          url += '?reviewed=true';
        } else if (reviewedFilter === 'not-reviewed') {
          url += '?reviewed=false';
        }

        console.log('Fetching from URL:', url); // Debug log
        console.log('API_BASE_URL:', API_BASE_URL); // Debug log
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('API response not OK:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          console.error('Attempted URL:', url);
          setListings([]);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Received listings:', data.length); // Debug log
        console.log('Sample listing:', data[0]); // Debug log
        // Keep all listings for the table, filtering for scatter plot happens separately
        setListings(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching car listings:', error);
        console.error('API_BASE_URL was:', API_BASE_URL);
        console.error('Full error details:', error.message);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.error('Network error - check if backend is accessible and CORS is configured');
        }
        setListings([]);
        setLoading(false);
      }
    };

    fetchListings();
    // Poll for new listings every 10 seconds
    const interval = setInterval(fetchListings, 10000);
    return () => clearInterval(interval);
  }, [reviewedFilter]);

  const handleReviewedToggle = async (listingId, currentReviewed) => {
    try {
      const response = await fetch(`${API_BASE_URL}/car-listings/${listingId}/reviewed`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewed: !currentReviewed }),
      });

      if (response.ok) {
        // Update the local state
        setListings(prevListings =>
          prevListings.map(listing =>
            listing._id === listingId
              ? { ...listing, reviewed: !currentReviewed }
              : listing
          )
        );
      } else {
        console.error('Failed to update reviewed status');
      }
    } catch (error) {
      console.error('Error updating reviewed status:', error);
    }
  };

  // Transform data for scatterplot - only include listings with both miles and listingPrice
  const scatterData = listings
    .filter(listing => listing.miles !== null && listing.listingPrice !== null)
    .map((listing, index) => ({
      x: listing.miles,
      y: listing.listingPrice,
      listing: listing,
      index: index
    }));

  // Calculate rounded domains for axes
  const maxMiles = scatterData.length > 0 ? Math.max(...scatterData.map(d => d.x)) : 0;
  const maxPrice = scatterData.length > 0 ? Math.max(...scatterData.map(d => d.y)) : 0;
  const minMiles = scatterData.length > 0 ? Math.min(...scatterData.map(d => d.x)) : 0;
  const minPrice = scatterData.length > 0 ? Math.min(...scatterData.map(d => d.y)) : 0;

  // Round X-axis: ceiling to next 10K miles
  const xAxisMax = maxMiles > 0 ? Math.ceil(maxMiles / 10000) * 10000 : 10000;
  const xAxisMin = minMiles > 0 ? Math.max(0, Math.floor(minMiles / 10000) * 10000) : 0;

  // Round Y-axis: round to nearest $1k (use ceil for max to ensure visibility, round for cleaner ticks)
  const yAxisMax = maxPrice > 0 ? Math.ceil(maxPrice / 1000) * 1000 : 1000;
  const yAxisMin = minPrice > 0 ? Math.max(0, Math.floor(minPrice / 1000) * 1000) : 0;

  // Generate evenly spaced ticks for X-axis (every 10K miles)
  const xAxisRange = xAxisMax - xAxisMin;
  const xTickInterval = xAxisRange <= 100000 ? 10000 : 20000; // Use 10K for ranges <= 100K, 20K for larger
  const xTicks = [];
  for (let i = xAxisMin; i <= xAxisMax; i += xTickInterval) {
    xTicks.push(i);
  }

  // Generate evenly spaced ticks for Y-axis (every $1K or $2K depending on range)
  const yAxisRange = yAxisMax - yAxisMin;
  const yTickInterval = yAxisRange <= 20000 ? 1000 : 2000; // Use $1K for ranges <= $20K, $2K for larger
  const yTicks = [];
  for (let i = yAxisMin; i <= yAxisMax; i += yTickInterval) {
    yTicks.push(i);
  }

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

  const getEmptyMessage = () => {
    if (reviewedFilter === 'reviewed') {
      return 'No reviewed listings found.';
    } else if (reviewedFilter === 'not-reviewed') {
      return 'No unreviewed listings found.';
    }
    return 'No car listings yet. Complete conversations to see listings here.';
  };

  return (
    <div className="car-listings-container">
      <div className="car-listings-header">
        <h1>Car Listings</h1>
        <p className="listings-count">{listings.length} car listing{listings.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter controls - always visible */}
      <div className="filter-controls-container">
        <div className="filter-controls">
          <button
            className={`filter-btn ${reviewedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setReviewedFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${reviewedFilter === 'reviewed' ? 'active' : ''}`}
            onClick={() => setReviewedFilter('reviewed')}
          >
            Reviewed
          </button>
          <button
            className={`filter-btn ${reviewedFilter === 'not-reviewed' ? 'active' : ''}`}
            onClick={() => setReviewedFilter('not-reviewed')}
          >
            Not Reviewed
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="no-listings">
          <p>{getEmptyMessage()}</p>
        </div>
      ) : (
        <>
          <div className="scatterplot-container">
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 100, left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Miles"
                  label={{ value: 'Number of Miles', position: 'outside', offset: 25, dy: 40 }}
                  domain={[xAxisMin, xAxisMax]}
                  ticks={xTicks}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Price"
                  label={{ value: 'Listing Price ($)', angle: -90, position: 'outside', offset: 25, dx: -80 }}
                  domain={[yAxisMin, yAxisMax]}
                  ticks={yTicks}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
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

          <div className="table-container">
            <div className="table-header-controls">
              <h2>All Listings</h2>
            </div>
            <div className="table-wrapper">
              <table className="listings-table">
                <thead>
                  <tr>
                    <th className="reviewed-column">Reviewed</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Year</th>
                    <th>Miles</th>
                    <th>Listing Price</th>
                    <th>Lowest Price</th>
                    <th>Tires</th>
                    <th>Title</th>
                    <th>Carfax</th>
                    <th>Doc Fee</th>
                    <th>Doc Fee Agreed</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing, index) => (
                    <tr key={listing._id || index}>
                      <td className="reviewed-column">
                        <input
                          type="checkbox"
                          checked={listing.reviewed || false}
                          onChange={() => handleReviewedToggle(listing._id, listing.reviewed || false)}
                          className="reviewed-checkbox"
                        />
                      </td>
                      <td>{listing.make || 'N/A'}</td>
                      <td>{listing.model || 'N/A'}</td>
                      <td>{listing.year || 'N/A'}</td>
                      <td>{listing.miles ? listing.miles.toLocaleString() : 'N/A'}</td>
                      <td>{listing.listingPrice ? `$${listing.listingPrice.toLocaleString()}` : 'N/A'}</td>
                      <td>{listing.lowestPrice ? `$${listing.lowestPrice.toLocaleString()}` : 'N/A'}</td>
                      <td>{listing.tireLifeLeft !== null ? (listing.tireLifeLeft ? 'Yes' : 'No') : 'N/A'}</td>
                      <td>{listing.titleStatus ? listing.titleStatus.charAt(0).toUpperCase() + listing.titleStatus.slice(1).replace('_', ' ') : 'N/A'}</td>
                      <td>{listing.carfaxDamageIncidents !== null ? (listing.carfaxDamageIncidents === 'yes' ? 'Yes' : listing.carfaxDamageIncidents === 'no' ? 'No' : listing.carfaxDamageIncidents === 'check_carfax' ? 'Check Carfax' : listing.carfaxDamageIncidents) : 'N/A'}</td>
                      <td>{listing.docFeeQuoted ? `$${listing.docFeeQuoted.toLocaleString()}` : 'N/A'}</td>
                      <td>{listing.docFeeAgreed ? `$${listing.docFeeAgreed.toLocaleString()}` : 'N/A'}</td>
                      <td>{listing.phoneNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CarListings;

