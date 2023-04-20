import { ChatGPTAPI } from 'chatgpt'
import express from 'express'
import dotenv from 'dotenv'
dotenv.config()

const app = express()

// Enable CORS middleware
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  next()
})

// Route to generate movie recommendations
app.get('/recommendations', async (req, res) => {
  const { director } = req.query

  // Generate the prompt to send to OpenAI
  const prompt  = `Generate movie recommendations for "${director}" but with a different director`;
  console.log(prompt);

  try {
    const api = new ChatGPTAPI({
      apiKey: process.env.CHAT_GPT_KEY
    })

    console.log(prompt);
    const response = await api.sendMessage(prompt)

    res.send(response.text)
  } catch (error) {
    console.error(error)
    res.status(500).send('Error generating movie recommendations')
  }
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
