import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'
import { useAuth } from '../context/AuthContext'

// Function to decode JWT token payload to get user ID
const decodeJWTPayload = (token) => {
  try {
    if (!token) return null
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

export default function UserProfile({ onViewChange, user }) {
  const [bookmarks, setBookmarks] = useState([])
  const [personBookmarks, setPersonBookmarks] = useState([])
  const [userRatings, setUserRatings] = useState([])
  const [personRatings, setPersonRatings] = useState([])
  const [searchHistory, setSearchHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Get user ID from JWT token
  const { token } = useAuth()
  const tokenPayload = token ? decodeJWTPayload(token) : null
  const userId = tokenPayload?.sub ? parseInt(tokenPayload.sub, 10) : null

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setError('No user ID found. Please login again.')
        setLoading(false)
        return
      }

      if (!token) {
        setError('No authentication token found. Please login again.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      
      try {
        console.log('Fetching user profile for user ID:', userId)
        console.log('Using token:', token ? 'Token present' : 'No token')
        
        // Get user details and additional user data in parallel
        const [userDetails, bookmarksResponse, personBookmarksResponse, ratingsResponse, personRatingsResponse, searchHistoryResponse] = await Promise.all([
          ApiService.getUser(userId).catch(() => null),
          ApiService.getUserBookmarks(userId).catch(() => null),
          ApiService.getUserPersonBookmarks(userId).catch(() => null),
          ApiService.getUserRatingHistory(userId).catch(() => null),
          ApiService.getMyPersonRatingHistory(1, 100).catch(() => null),
          ApiService.getUserSearchHistory(userId).catch(() => null)
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

        // Transform person bookmarks data
        let personBookmarksData = []
        if (personBookmarksResponse?.items || personBookmarksResponse) {
          const personBookmarks = personBookmarksResponse.items || personBookmarksResponse || []
          personBookmarksData = await Promise.all(
            personBookmarks.slice(0, 10).map(async (bookmark, index) => {
              try {
                const personDetails = await ApiService.getPersonDetails(bookmark.nconst)
                
                return {
                  id: bookmark.id || index + 1,
                  nconst: bookmark.nconst,
                  name: personDetails?.name || bookmark.name || 'Unknown Person',
                  birthYear: personDetails?.birthYear,
                  deathYear: personDetails?.deathYear,
                  note: bookmark.note || '',
                  addedAt: bookmark.addedAt || new Date().toISOString()
                }
              } catch (error) {
                return {
                  id: bookmark.id || index + 1,
                  nconst: bookmark.nconst,
                  name: bookmark.name || `Person ${index + 1}`,
                  note: bookmark.note || ''
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

        // Transform search history data
        let searchHistoryData = []
        if (searchHistoryResponse?.items) {
          const searches = searchHistoryResponse.items || []
          searchHistoryData = searches.map((search, index) => ({
            id: index + 1,
            query: search.text || 'Unknown search',
            timestamp: search.searchedAt || new Date().toISOString(),
            searchedAt: search.searchedAt || new Date().toISOString(),
            repeatUrl: search.links?.find(link => link.rel === 'repeat')?.href || null
          }))
        }

        setBookmarks(bookmarksData)
        setPersonBookmarks(personBookmarksData)
        setUserRatings(ratingsData)
        setPersonRatings(personRatingsData)
        setSearchHistory(searchHistoryData)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError('Failed to load user profile')
        
        // Set placeholder data if API fails
        setBookmarks([])
        setPersonBookmarks([])
        setUserRatings([])
        setPersonRatings([])
        setSearchHistory([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, token])

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
    <div className="container-fluid mt-4">
      <div className="row">
        {/* User Bookmarks */}
        <div className="col-md-2">
          <div className="border p-3 h-100">
            <h5 className="mb-3">Movie Bookmarks</h5>
            <div className="border p-2" style={{ height: '200px', overflowY: 'auto' }}>
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

        {/* Person Bookmarks */}
        <div className="col-md-2">
          <div className="border p-3 h-100">
            <h5 className="mb-3">Person Bookmarks</h5>
            <div className="border p-2" style={{ height: '200px', overflowY: 'auto' }}>
              {personBookmarks.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {personBookmarks.map((bookmark) => (
                    <li 
                      key={bookmark.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('person', { personId: bookmark.nconst })}
                    >
                      <div>
                        <strong>{bookmark.name}</strong>
                      </div>
                      <div className="small text-muted">
                        {bookmark.birthYear && `Born: ${bookmark.birthYear}`}
                        {bookmark.deathYear && ` - Died: ${bookmark.deathYear}`}
                        {bookmark.note && <div>Note: {bookmark.note}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No person bookmarks found</div>
              )}
            </div>
          </div>
        </div>

        {/* User Ratings */}
        <div className="col-md-2">
          <div className="border p-3 h-100">
            <h5 className="mb-3">Movie Ratings</h5>
            <div className="border p-2" style={{ height: '200px', overflowY: 'auto' }}>
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
                        <span className="badge bg-primary ms-2">{rating.userRating}/10</span>
                      </div>
                      <div className="small text-muted">{rating.type}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No movie ratings found</div>
              )}
            </div>
          </div>
        </div>

        {/* Person Ratings */}
        <div className="col-md-2">
          <div className="border p-3 h-100">
            <h5 className="mb-3">Person Ratings</h5>
            <div className="border p-2" style={{ height: '200px', overflowY: 'auto' }}>
              {personRatings.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {personRatings.map((rating) => (
                    <li 
                      key={rating.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('person', { personId: rating.nconst })}
                    >
                      <div>
                        <strong>{rating.name}</strong>
                        <span className="badge bg-success ms-2">{rating.userRating}/10</span>
                      </div>
                      <div className="small text-muted">
                        {rating.birthYear && `Born: ${rating.birthYear}`}
                        {rating.deathYear && ` - Died: ${rating.deathYear}`}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No person ratings found</div>
              )}
            </div>
          </div>
        </div>
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

        {/* Search History */}
        <div className="col-md-4">
          <div className="border p-3 h-100">
            <h5 className="mb-3">Search History</h5>
            <div className="border p-2" style={{ height: '200px', overflowY: 'auto' }}>
              {searchHistory.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {searchHistory.map((search) => (
                    <li 
                      key={search.id} 
                      className="mb-2 p-2 bg-light rounded"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewChange('search', { query: search.query })}
                    >
                      <div>
                        <strong>"{search.query}"</strong>
                      </div>
                      <div className="small text-muted">
                        {new Date(search.searchedAt).toLocaleDateString()} at {new Date(search.searchedAt).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No search history found</div>
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