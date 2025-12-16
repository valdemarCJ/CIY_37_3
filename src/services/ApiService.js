const API_BASE_URL = 'https://localhost:7098/api'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken')
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    }

    try {
      const response = await fetch(url, defaultOptions)
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Cannot connect to backend server. Please ensure the backend is running.')
      }
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

  // People endpoints
  async getPeople(page = 1, pageSize = 20) {
    return this.makeRequest(`/people?page=${page}&pageSize=${pageSize}`)
  }

  async getPersonDetails(nconst) {
    return this.makeRequest(`/people/${nconst}`)
  }

  // Note: Person filmography endpoint not available on backend
  // async getPersonFilmography(nconst, page = 1, pageSize = 20) {
  //   return this.makeRequest(`/people/${nconst}/movies?page=${page}&pageSize=${pageSize}`)
  // }

  // Get movies for a person (nconst -> list of tconst)
  async getPersonMovies(nconst) {
    return this.makeRequest(`/person-knownfor/by-person/${nconst}`)
  }

  // Get people for a movie (tconst -> list of nconst) 
  async getMoviePersons(tconst) {
    return this.makeRequest(`/movies/${tconst}/people`)
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

  // TheMovieDB API calls for person images
  async getPersonFromTMDB(nconst) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/find/${nconst}?external_source=imdb_id&api_key=ebcd153ea717146b23d6c12eeb847b80`)
      if (!response.ok) {
        throw new Error(`TMDB API request failed: ${response.status}`)
      }
      const data = await response.json()
      return data.person_results && data.person_results.length > 0 ? data.person_results[0] : null
    } catch (error) {
      console.error(`Error fetching person from TMDB for ${nconst}:`, error)
      return null
    }
  }

  async getPersonImages(tmdbPersonId) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/person/${tmdbPersonId}/images?api_key=ebcd153ea717146b23d6c12eeb847b80`)
      if (!response.ok) {
        throw new Error(`TMDB images API request failed: ${response.status}`)
      }
      const data = await response.json()
      return data.profiles || []
    } catch (error) {
      console.error(`Error fetching person images for ID ${tmdbPersonId}:`, error)
      return []
    }
  }
}

export default new ApiService()