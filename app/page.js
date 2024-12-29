'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setVisible(window.scrollY > 400);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <button
      className={`scroll-to-top ${visible ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPagination, setShowPagination] = useState(true);
  const [selectedLaunch, setSelectedLaunch] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const activityTimeoutRef = useRef(null);
  const paginationTimeout = useRef(null);
  const observerTarget = useRef(null);
  const launchesPerPage = 12;

  // Filter and search launches
  const filteredLaunches = launches.filter(launch => {
    const matchesSearch = launch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'upcoming' && new Date(launch.date_utc) > new Date()) ||
      (filter === 'success' && launch.success) ||
      (filter === 'failed' && launch.success === false);

    return matchesSearch && matchesFilter;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredLaunches.length / launchesPerPage);
  const startIndex = (currentPage - 1) * launchesPerPage;
  const paginatedLaunches = filteredLaunches.slice(startIndex, startIndex + launchesPerPage);

  // Function to show pagination temporarily
  const showPaginationTemporarily = useCallback(() => {
    setShowPagination(true);
    if (paginationTimeout.current) {
      clearTimeout(paginationTimeout.current);
    }
    paginationTimeout.current = setTimeout(() => {
      setShowPagination(false);
    }, 2000);
  }, []);

  // Handle launch selection
  const handleLaunchClick = useCallback((launch) => {
    const index = paginatedLaunches.findIndex(l => l.id === launch.id);
    setSelectedLaunch(launch);
    setSelectedIndex(index);
  }, [paginatedLaunches]);

  // Navigation handlers
  const handlePrevLaunch = useCallback(() => {
    if (!selectedLaunch) return;

    const currentIndex = selectedIndex;
    if (currentIndex > 0) {
      // Navigate within current page
      setSelectedLaunch(paginatedLaunches[currentIndex - 1]);
      setSelectedIndex(currentIndex - 1);
    } else if (currentPage > 1) {
      // Navigate to previous page
      const prevPageIndex = launchesPerPage - 1;
      const prevPageStart = startIndex - launchesPerPage;
      const prevLaunch = filteredLaunches[prevPageStart + prevPageIndex];
      
      handlePageChange(currentPage - 1);
      setSelectedLaunch(prevLaunch);
      setSelectedIndex(prevPageIndex);
    }
  }, [selectedLaunch, selectedIndex, currentPage, paginatedLaunches, filteredLaunches, startIndex, launchesPerPage]);

  const handleNextLaunch = useCallback(() => {
    if (!selectedLaunch) return;

    const currentIndex = selectedIndex;
    if (currentIndex < paginatedLaunches.length - 1) {
      // Navigate within current page
      setSelectedLaunch(paginatedLaunches[currentIndex + 1]);
      setSelectedIndex(currentIndex + 1);
    } else if (currentPage < totalPages) {
      // Navigate to next page
      const nextPageStart = startIndex + launchesPerPage;
      const nextLaunch = filteredLaunches[nextPageStart];
      
      handlePageChange(currentPage + 1);
      setSelectedLaunch(nextLaunch);
      setSelectedIndex(0);
    }
  }, [selectedLaunch, selectedIndex, currentPage, totalPages, paginatedLaunches, filteredLaunches, startIndex, launchesPerPage]);

  // Reset selected launch when filters change
  useEffect(() => {
    setSelectedLaunch(null);
    setSelectedIndex(null);
  }, [searchQuery, filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedLaunch) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevLaunch();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextLaunch();
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedLaunch(null);
          setSelectedIndex(null);
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, [selectedLaunch, handlePrevLaunch, handleNextLaunch]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      showPaginationTemporarily();
      if (typeof window !== 'undefined') {
        document.querySelector('.launches-grid')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [totalPages, showPaginationTemporarily]);

  // Fetch launches data
  useEffect(() => {
    const fetchLaunches = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://api.spacexdata.com/v4/launches');
        const data = await response.json();
        setLaunches(data.reverse());
      } catch (error) {
        console.error('Error fetching launches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLaunches();
  }, []);

  // Monitor user activity
  useEffect(() => {
    const handleActivity = () => {
      showPaginationTemporarily();
    };

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll'
    ];

    if (typeof window !== 'undefined') {
      events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true });
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      }
      if (paginationTimeout.current) {
        clearTimeout(paginationTimeout.current);
      }
    };
  }, [showPaginationTemporarily]);

  // Helper function to format time until launch
  const getTimeUntilLaunch = (launchDate) => {
    const now = new Date();
    const diff = launchDate - now;
    
    if (diff < 0) return 'Launched';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `T-${days}d ${hours}h`;
    } else if (hours > 0) {
      return `T-${hours}h ${minutes}m`;
    } else {
      return `T-${minutes}m`;
    }
  };

  // Infinite scroll implementation
  useEffect(() => {
    if (!observerTarget.current || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && currentPage < totalPages) {
          setLoadingMore(true);
          setCurrentPage(prev => prev + 1);
          setLoadingMore(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loadingMore, currentPage, totalPages]);

  // Modal component
  const LaunchModal = ({ launch, onClose, onPrev, onNext, isFirst, isLast }) => {
    if (!launch) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{launch.name}</h2>
              <div className="modal-subtitle">
                {new Date(launch.date_utc).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="modal-info-grid">
              <div className="modal-info-item">
                <div className="modal-info-label">Status</div>
                <div className="modal-info-value">
                  {new Date(launch.date_utc) > new Date() ? 'Upcoming' : 
                   (launch.success ? 'Successful' : 'Failed')}
                </div>
              </div>
              <div className="modal-info-item">
                <div className="modal-info-label">Rocket</div>
                <div className="modal-info-value">{launch.rocket?.name || 'Unknown'}</div>
              </div>
              <div className="modal-info-item">
                <div className="modal-info-label">Flight Number</div>
                <div className="modal-info-value">#{launch.flight_number}</div>
              </div>
            </div>

            <div className="modal-description">
              {launch.details || 'No detailed description available for this launch.'}
            </div>

            <div className="modal-nav-buttons">
              <button
                className="modal-nav-button prev"
                onClick={onPrev}
                disabled={isFirst}
                aria-label="Previous launch"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="modal-nav-button next"
                onClick={onNext}
                disabled={isLast}
                aria-label="Next launch"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="absolute inset-0 bg-grid"></div>
      
      {/* Search and Filter Container */}
      <div className="search-filter-container">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-[2000px] mx-auto">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search launches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filter Buttons */}
          <div className="filter-container">
            <button
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Launches
            </button>
            <button
              className={`filter-button ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`filter-button ${filter === 'success' ? 'active' : ''}`}
              onClick={() => setFilter('success')}
            >
              Successful
            </button>
            <button
              className={`filter-button ${filter === 'failed' ? 'active' : ''}`}
              onClick={() => setFilter('failed')}
            >
              Failed
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div>
              {/* Results Count */}
              <div className="results-count">
                <span key={filteredLaunches.length + filter}>
                  {filteredLaunches.length} {filter === 'all' ? 'Total' : filter} 
                  {filteredLaunches.length === 1 ? ' Launch' : ' Launches'} Found
                </span>
              </div>

              {/* Filter Buttons */}
              <div className="filter-container">
                <button
                  className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All Launches
                </button>
                <button
                  className={`filter-button ${filter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </button>
                <button
                  className={`filter-button ${filter === 'success' ? 'active' : ''}`}
                  onClick={() => setFilter('success')}
                >
                  Successful
                </button>
                <button
                  className={`filter-button ${filter === 'failed' ? 'active' : ''}`}
                  onClick={() => setFilter('failed')}
                >
                  Failed
                </button>
              </div>

              {/* Scheduled Launches Section */}
              {filter === 'upcoming' && (
                <div className="upcoming-section">
                  <h2 className="section-title">Scheduled Launches</h2>
                  <div className="launches-grid">
                    {filteredLaunches
                      .sort((a, b) => new Date(a.date_utc) - new Date(b.date_utc))
                      .map((launch) => {
                        const rocket = launch.rocket;
                        const launchDate = new Date(launch.date_utc);
                        const timeUntilLaunch = getTimeUntilLaunch(launchDate);
                        
                        return (
                          <div key={launch.id} className="card upcoming">
                            <div className="flex flex-col h-full">
                              <div className="flex-1">
                                <h3 className="card-title">{launch.name}</h3>
                                
                                <div className="mb-3">
                                  <div className="label">Launch Date</div>
                                  <div className="value">
                                    {launchDate.toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  <div className="text-xs text-purple-300 mt-1">
                                    {timeUntilLaunch}
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <div className="label">Rocket</div>
                                  <div className="value">{rocket?.name || 'Unknown'}</div>
                                </div>

                                {launch.details && (
                                  <div className="mb-3">
                                    <div className="label">Details</div>
                                    <div className="value details-preview">
                                      <span className="hidden sm:inline">Click</span>
                                      <span className="sm:hidden">Tap</span>
                                      <span> to read more</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-auto pt-3 flex items-center justify-between">
                                <div className={`status-badge ${new Date(launch.date_utc) > new Date() ? 'upcoming' : (launch.success ? 'success' : 'failed')}`}>
                                  {new Date(launch.date_utc) > new Date() ? (
                                    <>
                                      <svg className="countdown-circle" viewBox="0 0 32 32">
                                        <circle cx="16" cy="16" r="14" strokeDasharray="88" strokeDashoffset="0" />
                                        <circle cx="16" cy="16" r="14" />
                                      </svg>
                                      Scheduled
                                    </>
                                  ) : launch.success ? (
                                    <>✓ Success</>
                                  ) : (
                                    <>× Failed</>
                                  )}
                                </div>
                                
                                {launch.links?.webcast && (
                                  <a
                                    href={launch.links.webcast}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="webcast-link"
                                  >
                                    Watch
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Regular Launches Grid */}
              {filter !== 'upcoming' && (
                <>
                  <div className="launches-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                    {paginatedLaunches.map((launch, index) => (
                      <div
                        key={launch.id}
                        className="launch-card"
                        onClick={() => handleLaunchClick(launch)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLaunchClick(launch)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${launch.name}`}
                      >
                        <div className="launch-card-content">
                          <h3 className="launch-card-title">{launch.name}</h3>
                          <div className="launch-card-details">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`status-badge ${new Date(launch.date_utc) > new Date() ? 'upcoming' : (launch.success ? 'success' : 'failed')}`}>
                                {new Date(launch.date_utc) > new Date() ? (
                                  <>
                                    <svg className="countdown-circle" viewBox="0 0 32 32">
                                      <circle cx="16" cy="16" r="14" strokeDasharray="88" strokeDashoffset="0" />
                                      <circle cx="16" cy="16" r="14" />
                                    </svg>
                                    {getTimeUntilLaunch(new Date(launch.date_utc))}
                                  </>
                                ) : launch.success ? (
                                  <>✓ Success</>
                                ) : (
                                  <>× Failed</>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2 mb-4">
                              {launch.details || 'No details available'}
                            </p>
                            <button 
                              className="read-more-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLaunchClick(launch);
                              }}
                              aria-label={`Read more about ${launch.name}`}
                            >
                              Read More
                              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className={`pagination-container ${totalPages > 1 ? 'visible' : ''}`}>
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7m0 0l7 7-7 7" />
                      </svg>
                      Previous
                    </button>

                    <div className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </div>

                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7m0 0l7-7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* No Results Message */}
                  {paginatedLaunches.length === 0 && (
                    <div className="text-center py-8">
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No launches found</h3>
                      <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Scroll to Top */}
        <ScrollToTop />

        {/* Launch Details Modal */}
        {selectedLaunch && (
          <LaunchModal
            launch={selectedLaunch}
            onClose={() => {
              setSelectedLaunch(null);
              setSelectedIndex(null);
            }}
            onPrev={handlePrevLaunch}
            onNext={handleNextLaunch}
            isFirst={selectedIndex === 0 && currentPage === 1}
            isLast={selectedIndex === paginatedLaunches.length - 1 && currentPage === totalPages}
          />
        )}
      </div>

      {/* Footer - Copyright only */}
      <footer className="relative footer-blur">
        <div className="text-xs text-gray-400">
          {new Date().getFullYear()} SpaceX Launches • Data provided by SpaceX API
        </div>
      </footer>
    </div>
  );
}
