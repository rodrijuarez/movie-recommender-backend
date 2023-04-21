import express from "express";
import * as dotenv from "dotenv";
import axios from "axios";
import morgan from "morgan";
dotenv.config();

const app = express();

app.use(morgan("dev"));

// Enable CORS middleware
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Methods",
		"GET, PUT, POST, DELETE, OPTIONS"
	);
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	next();
});

async function getRecommendations(type, prompt) {
	const queryParams = {
		model: "text-davinci-003",
		prompt,
		max_tokens: 1000,
	};
	const headers = {
		Authorization: `Bearer ${process.env.CHAT_GPT_KEY}`,
		"Content-Type": "application/json",
	};

	const urlParams = new URLSearchParams(queryParams);
	const url = `https://api.openai.com/v1/completions`;

	const response = await axios.post(url, queryParams, { headers });

	return JSON.parse(response.data.choices[0].text);
}

async function getMovieRecommendations(seedMovie) {
	const prompt = `Generate five movies recommendations similar to the movie ${seedMovie} and send a Youtube trailer of the movie. Response in JSON format [{director, movie, trailer}]`;

	return await getRecommendations("movie", prompt);
}

async function getDirectorRecommendations(seedDirector) {
	const prompt = `Generate five movies recommendations from a different director than ${seedDirector} but with a similar style and send a Youtube trailer of the movie. Response in JSON format [{director, movie, trailer}]`;

	return await getRecommendations("movie director", prompt);
}

async function getActorRecommendations(seedActor) {
	const prompt = `Generate five movies recommendations where ${seedActor} or movies with a similar style proposed by ${seedActor} and send a Youtube trailer of the movie. Response in JSON format [{director, movie, trailer}]`;

	return await getRecommendations("actor", prompt);
}

// Route to generate movie recommendations
app.get("/recommendations", async (req, res) => {
	const { director } = req.query;

	try {
		const response = await getDirectorRecommendations(director);

		res.send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send(
			"Error generating movie director recommendations"
		);
	}
});

// Route to generate movie director recommendations
app.get("/movie-recommendations", async (req, res) => {
	const { movie } = req.query;

	try {
		const response = await getMovieRecommendations(movie);

		res.send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send("Error generating movie recommendations");
	}
});

// Route to generate actor recommendations
app.get("/actor-recommendations", async (req, res) => {
	const { actor } = req.query;

	try {
		const response = await getActorRecommendations(actor);

		res.send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send("Error generating actor recommendations");
	}
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
