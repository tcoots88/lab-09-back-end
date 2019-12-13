'use strict';

const superagent = require('superagent');
require('dotenv').config();

function Weather(forecast, time){
  this.forecast = forecast;
  this.time = time;
}

const getWeather = function (request, response) {
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
    response.status(500).send('you broke it');
  });
};

module.exports = getWeather;

