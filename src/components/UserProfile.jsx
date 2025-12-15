import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function UserProfile({ onViewChange, user }) {
  const [bookmarks, setBookmarks] = useState([])
  const [userRatings, setUserRatings] = useState([])
  const [watchHistory, setWatchHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const userId = 1 // In real app, this would come from user context/auth

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Get user details and additional user data in parallel
        const [userDetails, bookmarksResponse, ratingsResponse, watchHistory] = await Promise.all([
          ApiService.getUser(userId).catch(() => null),
          ApiService.getUserBookmarks(userId).catch(() => null),
          ApiService.getUserRatingHistory(userId).catch(() => null),
          ApiService.getWatchHistory(userId).catch(() => null)
        ])

        // Transform bookmarks data with enriched information
        let bookmarksData = []
        if (bookmarksResponse?.items || bookmarksResponse) {
          const bookmarks = bookmarksResponse.items || bookmarksResponse || []
          bookmarksData = await Promise.all(
            bookmarks.slice(0, 10).map(async (bookmark, index) => {
              try {
                const movieDetails = await ApiService.getMovie(bookmark.tconst)
                const imdbRating = await ApiService.getImdbRating(bookmark.tconst)
                
                return {
                  id: bookmark.id || index + 1,
                  tconst: bookmark.tconst,
                  title: movieDetails?.primaryTitle || bookmark.title || 'Unknown Title',
                  type: movieDetails?.titleType || bookmark.titleType || 'Movie',
                  rating: imdbRating?.averageRating || movieDetails?.averageRating || 'N/A',
                  year: movieDetails?.startYear,
                  note: bookmark.note || '',
                  addedAt: bookmark.addedAt || new Date().toISOString()
                }
              } catch (error) {
                return {
                  id: bookmark.id || index + 1,
                  tconst: bookmark.tconst,
                  title: bookmark.title || `Bookmark ${index + 1}`,
                  type: bookmark.titleType || 'Movie',
                  rating: 'N/A'
                }
              }
            })
          )
        }

        // Transform ratings data
        let ratingsData = []
        if (ratingsResponse?.items || ratingsResponse) {
          const ratings = ratingsResponse.items || ratingsResponse || []
          ratingsData = await Promise.all(
            ratings.slice(0, 10).map(async (rating, index) => {
              try {
                const movieDetails = await ApiService.getMovie(rating.tconst)
                const imdbRating = await ApiService.getImdbRating(rating.tconst)
                
                return {
                  id: rating.id || index + 1,
                  tconst: rating.tconst,
                  title: movieDetails?.primaryTitle || rating.title || 'Unknown Title',
                  type: movieDetails?.titleType || rating.titleType || 'Movie',
                  userRating: rating.rating || rating.value || 0,
                  overallRating: imdbRating?.averageRating || movieDetails?.averageRating || 'N/A',
                  year: movieDetails?.startYear,
                  ratedAt: rating.ratedAt || new Date().toISOString()
                }
              } catch (error) {
                return {
                  id: rating.id || index + 1,
                  tconst: rating.tconst,
                  title: rating.title || `Movie ${index + 1}`,
                  type: rating.titleType || 'Movie',
                  userRating: rating.rating || rating.value || 0,
                  overallRating: 'N/A'
                }
              }
            })
          )
        }

        // Transform watch history data
        let watchData = []
        if (watchHistory?.items || watchHistory) {
          const history = watchHistory.items || watchHistory || []
          watchData = history.slice(0, 5).map((item, index) => ({
            id: index + 1,
            tconst: item.tconst,
            title: item.title || `Movie ${index + 1}`,
            watchedAt: item.watchedAt || new Date().toISOString()
          }))
        }

        setBookmarks(bookmarksData)
        setUserRatings(ratingsData)
        setWatchHistory(watchData)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError('Failed to load user profile')
        
        // Set placeholder data if API fails
        setBookmarks([])
        setUserRatings([])
        setWatchHistory([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId])

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion requested. You will be logged out.')
      // Here you would typically call your API to delete the account
    }
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Unable to Load User Data</h4>
          <p>{error}</p>
          <p>This might be because you're not logged in or the server is not responding.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        {/* User Bookmarks */}
        <div className="col-md-4">
          <div className="border p-3 h-100">
            <h3 className="mb-3">User Bookmarks</h3>
            <div className="border p-2" style={{ height: '250px', overflowY: 'auto' }}>
              {bookmarks.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {bookmarks.map((bookmark) => (
                    <li 
                      key={bookmark.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('movie-details', { movieId: bookmark.tconst })}
                    >
                      <div>
                        <strong>{bookmark.title}</strong>
                        {bookmark.year && <span className="text-muted ms-2">({bookmark.year})</span>}
                      </div>
                      <div className="small text-muted">
                        {bookmark.type} • Rating: {bookmark.rating}
                        {bookmark.note && <div>Note: {bookmark.note}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No bookmarks found</div>
              )}
            </div>
          </div>
        </div>

        {/* User Ratings */}
        <div className="col-md-4">
          <div className="border p-3 h-100">
            <h3 className="mb-3">User Ratings</h3>
            <div className="border p-2" style={{ height: '250px', overflowY: 'auto' }}>
              {userRatings.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {userRatings.map((rating) => (
                    <li 
                      key={rating.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('movie-details', { movieId: rating.tconst })}
                    >
                      <div>
                        <strong>{rating.title}</strong>
                        {rating.year && <span className="text-muted ms-2">({rating.year})</span>}
                      </div>
                      <div className="small">
                        <span className="text-primary">Your Rating: {rating.userRating}</span>
                        <span className="text-muted ms-2">Overall: {rating.overallRating}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No ratings found</div>
              )}
            </div>
          </div>
        </div>

        {/* Watch History */}
        <div className="col-md-4">
          <div className="border p-3 h-100">
            <h3 className="mb-3">Watch History</h3>
            <div className="border p-2" style={{ height: '250px', overflowY: 'auto' }}>
              {watchHistory.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {watchHistory.map((item) => (
                    <li 
                      key={item.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('movie-details', { movieId: item.tconst })}
                    >
                      <div>
                        <strong>{item.title}</strong>
                      </div>
                      <div className="small text-muted">
                        Watched: {new Date(item.watchedAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No watch history found</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Button */}
      <div className="row mt-4">
        <div className="col-12">
          <button 
            className="btn btn-dark"
            onClick={handleDeleteAccount}
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}