'use strict';

const superagent = require('superagent');
require('dotenv').config();

function Yelp(name, image_url, price, rating, url) {
  this.name = name;
  this.image_url = image_url;
  this.price = price;
  this.rating = rating;
  this.url = url;
}


const getReviews = function(request, response) {
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
};

module.exports = getReviews;

