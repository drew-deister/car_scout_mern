import streamlit as st
import requests
import time
from datetime import datetime
import re
import os
from dotenv import load_dotenv

load_dotenv()

# Page configuration
st.set_page_config(
    page_title="Car Scout",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API base URL - use PORT from environment to match backend
API_PORT = int(os.getenv("PORT", 5001))
API_BASE_URL = f"http://localhost:{API_PORT}/api"

# Custom CSS - Modern, clean design
st.markdown("""
<style>
    /* Main container - White background */
    .main {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
    }
    
    .main .block-container {
        padding-top: 2rem;
        padding-left: 3rem;
        padding-right: 3rem;
        max-width: 1400px;
        background-color: #ffffff !important;
    }
    
    /* Sidebar styling - Light gray */
    [data-testid="stSidebar"] {
        background-color: #e9ecef !important;
        border-right: 1px solid #dee2e6;
    }
    
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1 {
        color: #212529 !important;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 2rem;
        padding: 0 1rem;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] {
        margin-top: 1rem;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] label {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 500;
        color: #212529 !important;
        border-radius: 8px;
        margin: 0.25rem 0;
        transition: all 0.2s;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] label * {
        color: #212529 !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] label span {
        color: #212529 !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
        background-color: #dee2e6;
        color: #000000 !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] label:hover * {
        color: #000000 !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] input[type="radio"]:checked + label {
        background-color: #007bff;
        color: #ffffff !important;
        font-weight: 600;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] input[type="radio"]:checked + label * {
        color: #ffffff !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stRadio"] input[type="radio"]:checked + label span {
        color: #ffffff !important;
    }
    
    /* Buttons */
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        background-color: #007bff;
        color: white;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border: none;
        transition: all 0.2s;
    }
    
    .stButton>button:hover {
        background-color: #0056b3;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,123,255,0.3);
    }
    
    /* Message styling */
    .message-item {
        padding: 0.875rem 1.125rem;
        border-radius: 16px;
        margin-bottom: 0.75rem;
        max-width: 75%;
        word-wrap: break-word;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .message-item.inbound {
        background-color: #f1f3f5;
        color: #212529;
        margin-right: auto;
        border-bottom-left-radius: 4px;
    }
    
    .message-item.outbound {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: #ffffff;
        margin-left: auto;
        border-bottom-right-radius: 4px;
    }
    
    /* Thread list styling */
    .thread-item {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .thread-item:hover {
        background-color: #f8f9fa;
        border-color: #007bff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Info boxes */
    .stInfo {
        background-color: #e7f3ff;
        border-left: 4px solid #007bff;
        padding: 1rem;
        border-radius: 4px;
    }
    
    /* Main content text visibility - Dark text on white */
    .main p, .main div, .main span, .main label {
        color: #212529 !important;
    }
    
    /* Titles */
    h1 {
        color: #212529 !important;
        font-weight: 700;
        margin-bottom: 1.5rem;
    }
    
    h2 {
        color: #212529 !important;
        font-weight: 600;
    }
    
    h3 {
        color: #212529 !important;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    
    /* Captions and labels */
    .stCaption {
        color: #6c757d !important;
    }
    
    /* Metric labels and values - Dark text */
    [data-testid="stMetricLabel"] {
        color: #6c757d !important;
    }
    
    [data-testid="stMetricValue"] {
        color: #212529 !important;
    }
    
    [data-testid="stMetricValue"] > div {
        color: #212529 !important;
    }
    
    /* All text elements in main area */
    .element-container, .stMarkdown, .stText {
        color: #212529 !important;
    }
    
    /* Selectbox text */
    [data-baseweb="select"] {
        color: #212529 !important;
    }
    
    [data-baseweb="select"] span {
        color: #212529 !important;
    }
    
    /* Info boxes */
    .stInfo {
        background-color: #e7f3ff;
        border-left: 4px solid #007bff;
        padding: 1rem;
        border-radius: 4px;
        color: #004085 !important;
    }
    
    .stInfo p, .stInfo div {
        color: #004085 !important;
    }
    
    /* Error boxes */
    .stError {
        color: #721c24 !important;
    }
    
    .stError p, .stError div {
        color: #721c24 !important;
    }
    
    /* Dataframe styling */
    .dataframe {
        color: #212529 !important;
        background-color: #ffffff !important;
    }
    
    /* Override Streamlit's default dark theme */
    .stApp {
        background-color: #ffffff !important;
    }
    
    /* All Streamlit text elements */
    .stMarkdown, .stText, .stDataFrame, .stSelectbox, .stButton {
        color: #212529 !important;
    }
    
    /* Column containers */
    [data-testid="column"] {
        background-color: transparent !important;
    }
    
    /* Ensure all text in main is dark */
    .main * {
        color: inherit;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Status indicator */
    .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
    }
    
    .status-online {
        background-color: #28a745;
    }
    
    .status-offline {
        background-color: #dc3545;
    }
</style>
""", unsafe_allow_html=True)


def format_phone_number(phone):
    """Format phone number for display"""
    cleaned = re.sub(r'\D', '', phone)
    if len(cleaned) == 11 and cleaned[0] == '1':
        return f"+1 ({cleaned[1:4]}) {cleaned[4:7]}-{cleaned[7:]}"
    elif len(cleaned) == 10:
        return f"({cleaned[0:3]}) {cleaned[3:6]}-{cleaned[6:]}"
    return phone


def format_time(timestamp):
    """Format timestamp for display"""
    if not timestamp:
        return ''
    
    try:
        if isinstance(timestamp, str):
            # Try parsing ISO format
            try:
                if 'T' in timestamp:
                    date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    # Try other formats
                    date = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
            except:
                # Try with timezone
                try:
                    date = datetime.fromisoformat(timestamp)
                except:
                    return timestamp[:10] if len(timestamp) >= 10 else timestamp
        else:
            date = timestamp
        
        # Remove timezone info for comparison
        if hasattr(date, 'tzinfo') and date.tzinfo:
            date = date.replace(tzinfo=None)
        
        now = datetime.now()
        diff = (now - date).total_seconds()
        
        minutes = int(diff / 60)
        hours = int(diff / 3600)
        days = int(diff / 86400)
        
        if minutes < 1:
            return 'Just now'
        if minutes < 60:
            return f'{minutes}m ago'
        if hours < 24:
            return f'{hours}h ago'
        if days < 7:
            return f'{days}d ago'
        return date.strftime('%m/%d/%Y')
    except Exception as e:
        # Return a simplified version if parsing fails
        if isinstance(timestamp, str):
            return timestamp[:10] if len(timestamp) >= 10 else timestamp
        return ''


def check_api_connection():
    """Check if the API is reachable"""
    try:
        response = requests.get(f"{API_BASE_URL}", timeout=2)
        return response.status_code == 200
    except:
        return False


# Sidebar navigation
st.sidebar.markdown("# Car Scout")
page = st.sidebar.radio(
    "Navigation",
    ["Home", "Listings"],
    label_visibility="collapsed"
)

# API Connection Status
api_connected = check_api_connection()
status_color = "🟢" if api_connected else "🔴"
status_text = "Connected" if api_connected else "Disconnected"

# Route to appropriate page
if page == "Home":
    st.title("Car Scout Dashboard")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("API Status", status_text)
    
    with col2:
        if api_connected:
            try:
                db_response = requests.get(f"{API_BASE_URL}/test-db", timeout=2)
                if db_response.status_code == 200:
                    db_data = db_response.json()
                    db_status = "🟢 Connected" if db_data.get("connected") else "🔴 Disconnected"
                    st.metric("Database", db_status)
                else:
                    st.metric("Database", "🔴 Unknown")
            except:
                st.metric("Database", "🔴 Unknown")
        else:
            st.metric("Database", "—")
    
    with col3:
        if api_connected:
            try:
                threads_response = requests.get(f"{API_BASE_URL}/threads", timeout=2)
                listings_response = requests.get(f"{API_BASE_URL}/car-listings", timeout=2)
                thread_count = len(threads_response.json()) if threads_response.status_code == 200 else 0
                listing_count = len(listings_response.json()) if listings_response.status_code == 200 else 0
                st.metric("Total Threads", thread_count)
                st.metric("Total Listings", listing_count)
            except:
                st.metric("Total Threads", "—")
                st.metric("Total Listings", "—")
        else:
            st.metric("Total Threads", "—")
            st.metric("Total Listings", "—")
    
    if not api_connected:
        st.error(f"⚠️ Cannot connect to backend API at {API_BASE_URL}. Please ensure the backend server is running on port {API_PORT}.")
        st.info("To start the backend, run: `python3 server.py` or use `./start.sh`")
    
elif page == "Listings":
    st.title("Car Listings")
    
    if not api_connected:
        st.error(f"⚠️ Cannot connect to backend API at {API_BASE_URL}. Please ensure the backend server is running.")
        st.stop()
    
    # Fetch listings
    listings = []
    valid_listings = []
    try:
        response = requests.get(f"{API_BASE_URL}/car-listings", timeout=5)
        if response.status_code == 200:
            listings = response.json()
            # Filter out listings without miles or listingPrice
            valid_listings = [l for l in listings if l.get('miles') is not None and l.get('listingPrice') is not None]
        elif response.status_code == 503:
            st.error("Database unavailable. Please check your MongoDB connection.")
        else:
            st.error(f"Failed to fetch car listings (Status: {response.status_code})")
    except requests.exceptions.ConnectionError:
        st.error(f"❌ Connection refused. Is the backend running on port {API_PORT}?")
    except requests.exceptions.Timeout:
        st.error("⏱️ Request timed out. The backend may be slow or unresponsive.")
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
    
    if listings:
        # Show all listings in a table
        st.markdown("### All Listings")
        display_listings = []
        for listing in listings:
            display_listings.append({
                "Year": listing.get('year', 'N/A'),
                "Make": listing.get('make', 'N/A'),
                "Model": listing.get('model', 'N/A'),
                "Miles": f"{listing.get('miles', 0):,}" if listing.get('miles') else 'N/A',
                "Price": f"${listing.get('listingPrice', 0):,}" if listing.get('listingPrice') else 'N/A',
                "Phone": format_phone_number(listing.get('phoneNumber', 'N/A')),
                "Complete": "✅" if listing.get('conversationComplete') else "⏳"
            })
        
        if display_listings:
            st.dataframe(display_listings, use_container_width=True, hide_index=True)
        
        # Show scatter plot for valid listings
        if valid_listings:
            st.markdown("### Price vs Miles Visualization")
            import plotly.graph_objects as go
            
            x_data = [l.get('miles', 0) for l in valid_listings]
            y_data = [l.get('listingPrice', 0) for l in valid_listings]
            
            # Create hover text
            hover_texts = []
            for listing in valid_listings:
                miles = listing.get('miles')
                price = listing.get('listingPrice')
                doc_fee = listing.get('docFeeQuoted')
                lowest_price = listing.get('lowestPrice')
                
                hover_text = f"Make: {listing.get('make', 'N/A')}<br>"
                hover_text += f"Model: {listing.get('model', 'N/A')}<br>"
                hover_text += f"Year: {listing.get('year', 'N/A')}<br>"
                hover_text += f"Miles: {miles:,}<br>" if miles is not None else "Miles: N/A<br>"
                hover_text += f"Price: ${price:,}<br>" if price is not None else "Price: N/A<br>"
                hover_text += f"Tires: {'Yes' if listing.get('tireLifeLeft') else 'No' if listing.get('tireLifeLeft') is not None else 'N/A'}<br>"
                hover_text += f"Title: {listing.get('titleStatus', 'N/A')}<br>"
                hover_text += f"Carfax: {listing.get('carfaxDamageIncidents', 'N/A')}<br>"
                hover_text += f"Doc Fee: ${doc_fee:,}<br>" if doc_fee is not None else "Doc Fee: N/A<br>"
                hover_text += f"Lowest Price: ${lowest_price:,}<br>" if lowest_price is not None else "Lowest Price: N/A<br>"
                hover_text += f"Phone: {listing.get('phoneNumber', 'N/A')}"
                hover_texts.append(hover_text)
            
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=x_data,
                y=y_data,
                mode='markers',
                marker=dict(
                    size=12,
                    color='#007bff',
                    line=dict(width=2, color='#0056b3')
                ),
                text=hover_texts,
                hoverinfo='text',
                name='Cars'
            ))
            
            fig.update_layout(
                title="Car Listings: Price vs Miles",
                xaxis_title="Number of Miles",
                yaxis_title="Listing Price ($)",
                height=600,
                hovermode='closest',
                margin=dict(l=80, r=20, t=50, b=60),
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                xaxis=dict(
                    title_font=dict(color='#212529', size=14),
                    tickfont=dict(color='#212529', size=12),
                    showline=True,
                    linecolor='#212529',
                    linewidth=1
                ),
                yaxis=dict(
                    title_font=dict(color='#212529', size=14),
                    tickfont=dict(color='#212529', size=12),
                    showline=True,
                    linecolor='#212529',
                    linewidth=1
                ),
                title_font=dict(color='#212529')
            )
            
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No car listings yet. Complete conversations to see listings here.")
    
    # Auto-refresh button
    if st.button("Refresh"):
        st.rerun()
    
    # Auto-refresh every 10 seconds (commented out to avoid constant refreshing)
    # time.sleep(10)
    # st.rerun()

