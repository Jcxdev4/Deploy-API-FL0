const express = require('express')
const crypto = require('node:crypto')
const movies = require('./movies.json')
const cors = require('cors')
const { validateMovie } = require('./schemas/movies.js')
const { validatePartialMovie } = require('./schemas/movies.js')

const app = express()
app.use(express.json())

app.use(
	cors({
		origin: (origin, callback) => {
			const ACCEPTED_ORIGINS = [
				'http://localhost:8080',
				'http://localhost:1234',
				'https://movies.com',
				'https://midu.dev'
			]

			if (ACCEPTED_ORIGINS.includes(origin)) {
				return callback(null, true)
			}

			if (!origin) {
				return callback(null, true)
			}

			return callback(new Error('Not allowed by CORS'))
		}
	})
)

// métodos normales: GET/HEAD/POST
// métodos complejos: PUT/PATCH/DELETE

// CORS PRE-Flight
// OPTIONS

app.disable('x-powered-by')

// Todos los recursos que sean MOVIES se identifica con movies
app.get('/movies', (req, res) => {
	res.header('Access-Control-Allow-Origin', '*')

	const { genre, rate } = req.query

	if (genre) {
		const filteredMovies = movies.filter((movie) =>
			movie.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
		)

		return res.json(filteredMovies)
	}

	if (rate) {
		const filteredMovies = movies.filter((movie) => movie.rate >= Number(rate))

		return res.json(filteredMovies)
	}

	res.json(movies)
})

app.post('/movies', (req, res) => {
	const result = validateMovie(req.body) // Aqui validamos todo con la logica que hicimos con ZOD

	if (!result.success) {
		// 422 Unprocessable Entity 0 400 Bad Request si lo suministrado no va acorde a las validaciones
		return res.status(400).json({ error: JSON.parse(result.error.message) })
	}

	// en base de datos
	const newMovie = {
		id: crypto.randomUUID(), // uuid v4
		...result.data // Lo suministrado por el cliente lo agregamos al objeto newMovie junto con el id creado con crypto
	}

	// Esto no sería REST, porque estamos guardando
	// el estado de la aplicación en memoria
	movies.push(newMovie)

	res.status(201).json(newMovie) // tiramos un 201 que es created + el objeto para mostrarlo en pantalla
})

app.patch('/movies/:id', (req, res) => {
	const result = validatePartialMovie(req.body) // Aqui otenemos lo que mandamos en el patch

	if (!result.success) {
		return res.status(400).json({ error: JSON.parse(result.error.message) }) // Si le enviamos algo que no sea un json, retorna este error 400 BAD request
	}

	const { id } = req.params // sacamos el id de los parametros de la request
	const movieIndex = movies.findIndex((movie) => movie.id === id) // Buscamos la pelicula con esa id

	if (movieIndex === -1) {
		return res.status(404).json({ message: 'Movie Not Found 404' }) // Si no aparece, tiramos un 404: Movie not Found
	}

	const updateMovie = {
		// Actualizamos la pelicula
		...movies[movieIndex], // con la copia de la pelicula encontrada
		...result.data // y lo suministrado por el cliente en la request.body
	}

	movies[movieIndex] = updateMovie // Le asignamos el nuevo objeto
	return res.json(updateMovie) // Finalmente retornamos, esto es un 200 OK pero es opcional ponerlo
})

app.delete('/movies/:id', (req, res) => {
	const { id } = req.params
	const movieIndex = movies.findIndex((movie) => movie.id === id)

	if (movieIndex === -1) {
		return res.status(404).json({ message: 'Movie Not Found 404' })
	}

	movies.splice(movieIndex, 1) // Eliminamos la pelicula
	return res.json({ message: 'Movie Deleted 204' })
})

// El recurso que sea movie y se identifique con la id
app.get('/movies/:id', (req, res) => {
	const { id } = req.params // Extraemos el id de los parametros
	const movie = movies.find((movie) => movie.id === id)
	if (movie) return res.json(movie)
	res.status(404).json({ message: 'Movie Not Found 404' })
})

const PORT = process.env.PORT ?? 1234

app.listen(PORT, () => {
	console.log(`App listening on port http://localhost:${PORT}`)
})
