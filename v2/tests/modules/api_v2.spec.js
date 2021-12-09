
let mongoose = require("mongoose");
let Api_v2 =  require('../../api_v2');

let assert = require('chai').assert;
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let expect = require('chai').expect;
let should = require('chai').should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised).should();
chai.use(chaiHttp);


describe('Api_v2', () => {
    beforeEach((done) => {
        Api_v2.remove({}, (err) => { 
           done();           
        });        
    });
  /*
  * Test the /POST route
  */
  describe('/api/login username', () => {
      it('it should not POST a book without pages field', (done) => {
          let book = {
              title: "The Lord of the Rings",
              author: "J.R.R. Tolkien",
              year: 1954
          }
        chai.request(server)
            .post('/username')
            .send(book)
            .end((err, res) => {
                  res.should.have.status(200);
                  res.body.should.be.a('object');
                  res.body.should.have.property('errors');
                  res.body.errors.should.have.property('pages');
                  res.body.errors.pages.should.have.property('kind').eql('required');
              done();
            });
      });

  });
});
