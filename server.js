'use strict';

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

// API routes
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/events', getEventBrite);
app.get('/movies', getMovies);
app.get('/yelp', getReviews);


// Database initial
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => console.error(error));
client.connect();



app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

function Location(city, geoData){
  this.search_query = city;
  this.formatted_query = geoData.formatted_address;
  this.latitude = geoData.geometry.location.lat;
  this.longitude = geoData.geometry.location.lng;
}

// Route Handler
function getLocation(request, response) {
  const tableName = 'locations';
  const fieldName = 'search_query';
  const locationHandler = {
    query: request.query.data,
    // if there is data existing
    cacheHit: (results) => {
      response.send(results.rows[0]);
    },
    // if there is no data existing
    cacheMiss: () => {
      fetchLocation(request.query.data)
        .then(data => response.send(data));
    },
  };
  checkDuplicate(locationHandler, tableName, fieldName);
}


function checkDuplicate(handler, tableName, fieldName) {
  const SQL = `SELECT * FROM ${tableName} WHERE ${fieldName}=$1`;
  const values = [handler.query];
  return client.query( SQL, values )
    .then(results => {
      if(results.rowCount > 0) {
        // if there is data existing
        handler.cacheHit(results);
      }
      else {
        // if there is no data existing
        handler.cacheMiss();
      }
    })
    .catch(console.error);
}


function fetchLocation(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODING_API_KEY}`;
  return superagent.get(url).then(data => {
    let location = new Location(query, data.body.results[0]);
    return location.saveDB().then(
      result => {
        location.id = result.rows[0].id;
        return location;
      }
    )
  })
}

// Save a location to the DB
Location.prototype.saveDB = function() {
  let SQL = `
    INSERT INTO locations
      (search_query,formatted_query,latitude,longitude) 
      VALUES($1,$2,$3,$4) 
      RETURNING id
  `;
  let values = Object.values(this);
  return client.query(SQL,values);
};


function Weather(forecast, time){
  this.forecast = forecast;
  this.time = time;
}

function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  superagent.get(url).then(data => {
    const weatherData = data.body.daily.data.map(obj => {
      let forecast = obj.summary;
      let formattedTime = new Date(obj.time * 1000).toDateString();
      return new Weather(forecast, formattedTime);
    })
    response.status(200).send(weatherData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  });
}

// ******** EVENT **********

function Event(link, name, event_date, summary){
  this.link = link;
  this.name = name;
  this.event_date = event_date;
  this.summary = summary;
}


function getEventBrite(request, response) {
  const url = `http://api.eventful.com/json/events/search?location=${request.query.data.formatted_query}&app_key=${process.env.EVENTBRITE_API_KEY}`;
  superagent.get(url).then(data => {
    const parsedData = JSON.parse(data.text);
    const eventData = parsedData.events.event.map(data => {
      const link = data.url;
      const name = data.title;
      const event_date = new Date(data.start_time).toDateString();
      const summary = data.description;
      return new Event(link, name, event_date, summary);
    })
    response.status(200).send(eventData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  })
}



// ******** MOVIE **********
function Movie(title, overview, average_votes, image_url, popularity, released_on) {
  this.title = title;
  this.overview = overview;
  this.average_votes = average_votes;
  this.image_url = `https://image.tmdb.org/t/p/w500${image_url}`;
  this.popularity = popularity;
  this.released_on = released_on;
}


function getMovies(request, response) {
  const url = `https://api.themoviedb.org/3/search/movie/?api_key=${process.env.MOVIE_API_KEY}&language=en-US&page=1&query=${request.query.data.search_query}`;
  superagent.get(url).then(data => {
    const parsedData = JSON.parse(data.text);
    const movieData = parsedData.results.map(data => {
      const title = data.title;
      const overview = data.overview;
      const average_votes = data.vote_average;
      const image_url = data.poster_path;
      const popularity = data.popularity;
      const released_on = data.release_date;
      return new Movie(title, overview, average_votes, image_url, popularity, released_on);
    })
    response.status(200).send(movieData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  })
}



// ******** YELP **********
function Yelp(name, image_url, price, rating, url) {
  this.name = name;
  this.image_url = image_url;
  this.price = price;
  this.rating = rating;
  this.url = url;
}


function getReviews(request, response) {
  const url = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;
  superagent.get(url).set('Authorization', `Bearer ${process.env.YELP_API_KEY}`).then(data => {
    const parsedData = JSON.parse(data.text);
    const yelpData = parsedData.businesses.map(business => {
      const name = business.name;
      const image_url = business.image_url;
      const price = business.price;
      const rating = business.rating;
      const url = business.url;
      return new Yelp(name, image_url, price, rating, url);
    })
    response.status(200).send(yelpData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  })
}

