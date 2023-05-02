import express from 'express'
import * as dotenv from 'dotenv'
import axios from 'axios'
import morgan from 'morgan'
dotenv.config()

const app = express()

if (process.env.DEV) {
  app.use(morgan('dev'))
}

const TMDB_URL = 'https://api.themoviedb.org/3'

const viewHistory = [
  'tt0073486', // One Flew Over the Cuckoo's Nest
  'tt3774694', // Love
  'tt0243017', // Waking Life
  'tt0110912', // Pulp Fiction
  'tt1065073', // BoyHood
]
// Enable CORS middleware
app.use(function (req, res, next) {
  res.header(
    'Access-Control-Allow-Origin',
    process.env.DEV ? '*' : 'https://github.com'
  )
  res.header(
    'Access-Control-Allow-Methods',
    'GET, PUT, POST, DELETE, OPTIONS'
  )
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  next()
})

const getTrailers = async (movies) => {
  try {
    const movieIdsResponses = await Promise.all(
      movies.map((movie) => {
        const movieURL = `${TMDB_URL}/find/${movie.imdb}`

        return axios.get(movieURL, {
          params: {
            external_source: 'imdb_id',
            api_key: process.env.TMDB_KEY,
          },
        })
      })
    )

    const movieIds = movieIdsResponses.map(
      (response) => response.data
    )

    const movieVideosResponses = await Promise.all(
      movieIds.map((item) => {
        if (!item.movie_results.length)
          return Promise.resolve({ data: {} })

        const movieURL = `${TMDB_URL}/movie/${item.movie_results[0].id}/videos`

        return axios.get(movieURL, {
          params: {
            api_key: process.env.TMDB_KEY,
          },
        })
      })
    )

    const movieVideos = movieVideosResponses.map(
      (response) => response.data
    )

    const moviesWithTrailers = movies.map(
      (movie, index) => {
        const movieTrailer = movieVideos[
          index
        ].results?.find((video) => video.type === 'Trailer')
        const trailerKey = movieTrailer
          ? movieTrailer.key
          : null

        return { ...movie, trailer: trailerKey }
      }
    )

    return moviesWithTrailers
  } catch (error) {
    console.error(error)
    return null
  }
}

async function getRecommendations(prompt) {
  const queryParams = {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  }
  const headers = {
    Authorization: `Bearer ${process.env.CHAT_GPT_KEY}`,
    'Content-Type': 'application/json',
  }

  const urlParams = new URLSearchParams(queryParams)
  const url = `https://api.openai.com/v1/chat/completions`

  const response = await axios.post(url, queryParams, {
    headers,
  })

  const textResponse =
    response.data.choices[0].message.content

  const cleanTextResponse = textResponse.slice(
    textResponse.indexOf('[')
  )

  const moviesWithTrailers = await getTrailers(
    JSON.parse(cleanTextResponse)
  )

  return moviesWithTrailers
}

async function getMovieRecommendations(seedMovie) {
  const prompt = `Generate five movies recommendations similar to the movie ${seedMovie}, also send the IMDB ID of the movie as "imdb" in this format for example "tt1602613". Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations(prompt)
}

async function getDirectorRecommendations(seedDirector) {
  const prompt = `Generate five movie recommendations from a different director than ${seedDirector} but with a similar style and genre than ${seedDirector}, also send the IMDB ID of the movie as "imdb" in this format for example "tt1602613". Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations(prompt)
}

async function getActorRecommendations(seedActor) {
  const prompt = `Generate five movies recommendations where ${seedActor} or movies with a similar style proposed by ${seedActor}, also send the IMDB ID of the movie as "imdb" in this format for example "tt1602613". Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations(prompt)
}

async function getViewHistoryRecommendations() {
  const prompt = `Generate five movies recommendations based on this list of imdb movies (i'm sending the IMDB ids) ${viewHistory}, also send the IMDB ID of the movie as "imdb" in this format for example "tt1602613". Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations(prompt)
}

// Route to generate movie recommendations
app.get('/recommendations', async (req, res) => {
  const { director } = req.query

  try {
    const response = await getDirectorRecommendations(
      director
    )

    res.send(response)
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .send(
        'Error generating movie director recommendations'
      )
  }
})

// Route to generate movie director recommendations
app.get('/movie-recommendations', async (req, res) => {
  const { movie } = req.query

  try {
    const response = await getMovieRecommendations(movie)

    res.send(response)
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .send('Error generating movie recommendations')
  }
})

// Route to generate actor recommendations
app.get('/actor-recommendations', async (req, res) => {
  const { actor } = req.query

  try {
    const response = await getActorRecommendations(actor)

    res.send(response)
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .send('Error generating actor recommendations')
  }
})

// Route to generate actor recommendations
app.get('/recommendations/history', async (req, res) => {
  try {
    const response = await getViewHistoryRecommendations()

    res.send(response)
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .send('Error generating history recommendations')
  }
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
