const API_BASE_URL = 'https://localhost:7098/api'

class ApiService {
  constructor() {
    this.token = sessionStorage.getItem('authToken')
  }

  // Update token when authentication occurs (called from AuthContext)
  setToken(token) {
    this.token = token
  }

  // Clear token on logout
  clearToken() {
    this.token = null
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    // Get fresh token from sessionStorage
    const currentToken = sessionStorage.getItem('authToken')
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { Authorization: `Bearer ${currentToken}` })
      },
      ...options
    }

    try {
      const response = await fetch(url, defaultOptions)
      
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear auth data
        sessionStorage.removeItem('authToken')
        sessionStorage.removeItem('authExpiresAt')
        this.token = null
        
        // Trigger redirect to login (component will handle this)
        window.dispatchEvent(new Event('auth:logout'))
        throw new Error('Unauthorized - please login again')
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error)
      throw error
    }
  }

  // Movies
  async getMovies(page = 1, pageSize = 20) {
    return this.makeRequest(`/Movies?page=${page}&pageSize=${pageSize}`)
  }

  async getMoviesOnly(page = 1, pageSize = 20) {
    return this.makeRequest(`/Movies/types/movies?page=${page}&pageSize=${pageSize}`)
  }

  async getSeriesOnly(page = 1, pageSize = 20) {
    return this.makeRequest(`/Movies/types/series?page=${page}&pageSize=${pageSize}`)
  }

  async getSpecialContent(page = 1, pageSize = 20) {
    return this.makeRequest(`/Movies/types/special?page=${page}&pageSize=${pageSize}`)
  }

  async getMovie(tconst) {
    return this.makeRequest(`/Movies/${tconst}`)
  }

  async searchMovies(query, page = 1, pageSize = 20) {
    return this.makeRequest(`/Search?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`)
  }

  async getMovieDetails(tconst) {
    return this.makeRequest(`/movie-details/${tconst}`)
  }

  // People
  async getPeople(page = 1, pageSize = 20) {
    return this.makeRequest(`/People?page=${page}&pageSize=${pageSize}`)
  }

  async getPerson(nconst) {
    return this.makeRequest(`/People/${nconst}`)
  }

  async getMoviePeople(tconst) {
    return this.makeRequest(`/movie-people/${tconst}/people`)
  }

  async getMovieGenres(tconst) {
    return this.makeRequest(`/movie-genres/${tconst}/genres`)
  }

  async getSimilarMovies(tconst) {
    return this.makeRequest(`/Analytics/similar/${tconst}`)
  }

  async getPopularActors(tconst) {
    return this.makeRequest(`/Analytics/popular-actors/${tconst}`)
  }

  // Ratings
  async getImdbRating(tconst) {
    return this.makeRequest(`/imdb-ratings/${tconst}`)
  }

  async rateMovie(tconst, value) {
    return this.makeRequest(`/Ratings?tconst=${tconst}&value=${value}`, {
      method: 'POST'
    })
  }

  // Auth
  async login(username, password) {
    const response = await this.makeRequest(`/Auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      method: 'POST'
    })
    
    if (response.token) {
      this.token = response.token
      localStorage.setItem('authToken', this.token)
    }
    
    return response
  }

  async register(userData) {
    return this.makeRequest('/Users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  // User specific
  async getUserBookmarks(userId, page = 1, pageSize = 20) {
    return this.makeRequest(`/users/${userId}/Bookmarks?page=${page}&pageSize=${pageSize}`)
  }

  async addBookmark(userId, tconst, note = '') {
    return this.makeRequest(`/users/${userId}/Bookmarks?tconst=${tconst}&note=${encodeURIComponent(note)}`, {
      method: 'POST'
    })
  }

  async removeBookmark(userId, tconst) {
    return this.makeRequest(`/users/${userId}/Bookmarks/${tconst}`, {
      method: 'DELETE'
    })
  }

  async getUserRatingHistory(userId, page = 1, pageSize = 20) {
    return this.makeRequest(`/Users/${userId}/history/ratings?page=${page}&pageSize=${pageSize}`)
  }

  async getUser(userId) {
    return this.makeRequest(`/Users/${userId}`)
  }

  // Analytics
  async getSimilarMovies(tconst) {
    return this.makeRequest(`/Analytics/similar/${tconst}`)
  }

  async getPopularActors(tconst) {
    return this.makeRequest(`/Analytics/popular-actors/${tconst}`)
  }

  // Search functionality
  async searchMovies(query, page = 1, pageSize = 20) {
    return this.makeRequest(`/search?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`)
  }

  // Name basics (for person details)
  async getNameBasics(nconst) {
    return this.makeRequest(`/name-basics/${nconst}`)
  }

  async getPersonFilmography(nconst, page = 1, pageSize = 20) {
    return this.makeRequest(`/name-basics/${nconst}/movies?page=${page}&pageSize=${pageSize}`)
  }

  // Watch history
  async getWatchHistory(userId, page = 1, pageSize = 20) {
    return this.makeRequest(`/Users/${userId}/history/watch?page=${page}&pageSize=${pageSize}`)
  }

  async addToWatchHistory(userId, tconst) {
    return this.makeRequest(`/Users/${userId}/history/watch?tconst=${tconst}`, {
      method: 'POST'
    })
  }

  logout() {
    this.token = null
    localStorage.removeItem('authToken')
  }
}

export default new ApiService()