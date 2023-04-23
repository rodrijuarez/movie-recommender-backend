import express from 'express'
import * as dotenv from 'dotenv'
import axios from 'axios'
import morgan from 'morgan'
dotenv.config()

const app = express()

app.use(morgan('dev'))

const TMDB_URL = 'https://api.themoviedb.org/3'

// Enable CORS middleware
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
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
          return Promise.resolve(null)

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

async function getRecommendations(type, prompt) {
  const queryParams = {
    model: 'text-davinci-003',
    prompt,
    max_tokens: 1000,
  }
  const headers = {
    Authorization: `Bearer ${process.env.CHAT_GPT_KEY}`,
    'Content-Type': 'application/json',
  }

  const urlParams = new URLSearchParams(queryParams)
  const url = `https://api.openai.com/v1/completions`

  const response = await axios.post(url, queryParams, {
    headers,
  })

  const textResponse = response.data.choices[0].text

  const moviesWithTrailers = await getTrailers(
    JSON.parse(textResponse)
  )

  return moviesWithTrailers
}

async function getMovieRecommendations(seedMovie) {
  const prompt = `Generate five movies recommendations similar to the movie ${seedMovie} and send the IMDB ID of the movie. Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations('movie', prompt)
}

async function getDirectorRecommendations(seedDirector) {
  const prompt = `Generate five movies recommendations from a different director than ${seedDirector} but with a similar style and send the IMDB ID of the movie. Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations('movie director', prompt)
}

async function getActorRecommendations(seedActor) {
  const prompt = `Generate five movies recommendations where ${seedActor} or movies with a similar style proposed by ${seedActor} and send the IMDB ID of the movie. Response in JSON format [{"director", "movie", "imdb"}] where I can use JSON.parse respecting the camel case format`

  return await getRecommendations('actor', prompt)
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

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
