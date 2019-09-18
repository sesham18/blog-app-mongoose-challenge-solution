'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const should = chai.should;
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
chai.use(chaiHttp);


function seedBlogPostData() {
  console.info('seeding post data');
  const seedData = [];
  for (let i=1; i<=10; i++) { 
    seedData.push({
        author: {
            firstName: faker.name.firstName(), 
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(), 
        content: faker.lorem.text(),
        created: faker.date.past()
    });
  };
      
  // this will return a promise
  return BlogPost.insertMany(seedData);
};


function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blog Posts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all existing blog posts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.lengthOf(count);
        });
    });


    it('should return blog posts with right fields', function() {
      let resPosts;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.lengthOf.at.least(1);
          res.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys(
              'id', 'title', 'content', 'author', 'created');
          });
          resPosts = res.body[0];
          return BlogPost.findById(resPosts.id);
        })
        .then(function(post) {
          resPosts.id.should.equal(post.id);
          resPosts.title.should.equal(post.title);
          resPosts.content.should.equal(post.content);
          resPosts.author.should.equal(post.author);
          resPosts.created.to.equal(post.created);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new post', function() {
      const newPost = generateBlogPostData();
      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newPost.title);
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName); 
          post.created.should.equal(newPost.created);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion'
      };

      return BlogPost
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('delete a restaurant by id', function() {
      let post;
      return BlogPost
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(_post) {
          _post.should.be.null;
        });
    });
  });
});
