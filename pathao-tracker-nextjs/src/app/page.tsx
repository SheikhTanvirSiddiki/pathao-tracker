'use client';

import { useState, useEffect } from 'react';

interface TimelineEvent {
  event: string;
  detail: string;
  timestamp: string;
}

interface TrackingData {
  consignment_id: string;
  phone: string;
  current_status: string;
  recipient_name: string;
  address: string;
  seller: string;
  product_description: string;
  amount: string;
  timeline: TimelineEvent[];
}

export default function Home() {
  const [consignmentId, setConsignmentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consignmentId || !phoneNumber) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consignment_id: consignmentId.toUpperCase(),
          phone: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Tracking failed');
      } else {
        setTrackingData(data);
      }
    } catch (err) {
      setError('Failed to connect to tracking service');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Delivered': 'bg-green-500',
      'Ready for Delivery': 'bg-orange-500',
      'In Transit': 'bg-blue-500',
      'Picked': 'bg-yellow-500',
      'Accepted': 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const progressSteps = ['Accepted', 'Picked', 'In Transit', 'Ready for Delivery', 'Delivered'];
  const currentStepIndex = trackingData?.current_status ? 
    progressSteps.findIndex(step => step.toLowerCase() === trackingData.current_status.toLowerCase()) : -1;

  return (
    <div className="min-h-screen bg-black text-white p-4" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px)`,
      backgroundSize: '20px 20px'
    }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          {mounted ? (
            <>
              <h1 className="text-6xl font-black mb-2 tracking-tight" style={{letterSpacing: '-0.02em'}}>Pathao Tracker</h1>
              <p className="text-gray-400 text-sm tracking-widest uppercase mb-4">Track Your Shipment</p>
              <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full"></div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2">Pathao Tracker</h1>
              <p className="text-gray-400">Track your parcels in real-time</p>
            </>
          )}
        </div>

        {/* Tracking Form */}
        {mounted && (
          <div className="bg-gray-900 rounded-lg p-8 mb-6 border border-gray-800" style={{boxShadow: '0 0 40px rgba(0,0,0,0.5)'}}>
            <div className="mb-8">
              <h2 className="text-yellow-500 font-mono text-sm tracking-widest uppercase mb-2">// Track Your Shipment</h2>
              <div className="w-16 h-0.5 bg-yellow-500 rounded-full"></div>
            </div>
            <form onSubmit={handleTrack} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Consignment ID</label>
                  <input
                    type="text"
                    value={consignmentId}
                    onChange={(e) => setConsignmentId(e.target.value)}
                    placeholder="Enter consignment ID"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all text-white placeholder-gray-500"
                    style={{fontSize: '16px'}}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all text-white placeholder-gray-500"
                    style={{fontSize: '16px'}}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-12 py-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-yellow-500/25"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Tracking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Track Shipment
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
                </button>
                {trackingData && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrackingData(null);
                      setError('');
                    }}
                    className="px-6 py-4 bg-gray-800 text-gray-400 font-medium rounded-lg hover:bg-gray-700 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-6 mb-6" style={{backdropFilter: 'blur(10px)'}}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 font-semibold">Tracking Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Results */}
        {trackingData && (
          <div className="space-y-8">
            {/* Status Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-3">// Consignment ID</p>
                  <p className="text-2xl font-black" style={{fontFamily: 'monospace', letterSpacing: '0.05em'}}>{trackingData.consignment_id}</p>
                  <div className="w-12 h-0.5 bg-yellow-500 rounded-full mt-3"></div>
                </div>
                <div className="text-right">
                  <div className={`px-6 py-3 rounded-full font-bold text-lg shadow-lg ${getStatusColor(trackingData.current_status)}`}>
                    {trackingData.current_status}
                  </div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mt-2">Current Status</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
              <div className="mb-8">
                <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-3">// Delivery Progress</h3>
                <div className="w-12 h-0.5 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute left-0 top-6 w-full h-1 bg-gray-700 rounded-full z-0"></div>
                <div 
                  className="absolute left-0 top-6 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full z-0 transition-all duration-700 ease-out"
                  style={{width: `${currentStepIndex >= 0 ? ((currentStepIndex + 1) / progressSteps.length) * 100 : 0}%`}}
                ></div>
                
                {progressSteps.map((step, index) => (
                  <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                      index <= currentStepIndex 
                        ? 'bg-gradient-to-br from-green-500 to-green-400 shadow-green-500/50' 
                        : 'bg-gray-700 border-2 border-gray-600'
                    }`}>
                      {index <= currentStepIndex ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-xs mt-4 text-center font-semibold transition-all duration-300 ${
                      index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                    }`}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-4">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Recipient</h3>
                  <div className="w-8 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <p className="text-lg font-medium leading-relaxed">{trackingData.recipient_name || '—'}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-4">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Address</h3>
                  <div className="w-8 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <p className="text-lg font-medium leading-relaxed">{trackingData.address || '—'}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-4">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Phone</h3>
                  <div className="w-8 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <p className="text-lg font-medium leading-relaxed">{trackingData.phone || '—'}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-4">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Seller</h3>
                  <div className="w-8 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <p className="text-lg font-medium leading-relaxed">{trackingData.seller || '—'}</p>
              </div>
            </div>

            {/* Product Information */}
            {(trackingData.product_description || trackingData.amount) && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-6">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Item Details</h3>
                  <div className="w-12 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-8">
                    <p className="text-lg font-medium leading-relaxed">{trackingData.product_description || '—'}</p>
                  </div>
                  {trackingData.amount && (
                    <div className="text-right">
                      <p className="text-3xl font-black text-yellow-500">৳{Number(trackingData.amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-400 uppercase tracking-wider mt-2">Cash on Delivery</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            {trackingData.timeline && trackingData.timeline.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700" style={{boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                <div className="mb-8">
                  <h3 className="text-yellow-500 font-mono text-xs tracking-widest uppercase mb-2">// Event Log</h3>
                  <div className="w-12 h-0.5 bg-yellow-500 rounded-full"></div>
                </div>
                <div className="space-y-8">
                  {trackingData.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex gap-6 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-400 rounded-full shadow-lg shadow-green-500/50"></div>
                        {index < trackingData.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gradient-to-b from-green-500 to-green-400 mt-3"></div>
                        )}
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="font-semibold text-white text-lg">{event.event}</p>
                        {event.detail && <p className="text-gray-400 text-sm mt-2 leading-relaxed">{event.detail}</p>}
                        {event.timestamp && <p className="text-gray-500 text-xs uppercase tracking-wider mt-3">{event.timestamp}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
