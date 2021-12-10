let assert = require('chai').assert;
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = 'https://SERVER_URL.cloudfunctions.net/api_v2';
let expect = require('chai').expect;
let should = require('chai').should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised).should();
chai.use(chaiHttp);


describe('API_V2', () => {
  describe("POST /auth/signup", () => {
    it("It should return an ok if signup is successful", (done) => {
        const credentials = {
            phoneNumber: "+254721234567",
            countryCode: "KE",
            password: "fsydhjashdfjksuYSzzDA3FUa88u4sP"
        };
        chai.request(server)                
            .post("/auth/signup")
            .send(credentials)
            .end((err, res) => {
                res.should.have.status(201);
                res.body.should.be.a('object');
                res.body.should.have.property('status').eq('OK');
            done();
        });
    });
  });

  describe("POST /api/login", () => {
    it("It should return an accessToken", (done) => {
        const credentials = {
            phoneNumber: "+254721234567",
            countryCode: "KE",
            password: "fsydhjashdfjksuYSzzDA3FUa88u4sP"
        };
        chai.request(server)                
            .post("/api/login")
            .send(credentials)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('accessToken');
            done();
        });
    });
  });

  const userCredentials = {
        phoneNumber: "+254721234567",
        countryCode: "KE",
        password: "fsydhjashdfjksuYSzzDA3FUa88u4sP"
    };
  
    var authenticatedUser = request.agent(server);
    before(function(done){
        authenticatedUser
        .post('/api/login')
        .send(userCredentials)
        .end(function(err, response){
            expect(response.statusCode).to.equal(200);
            expect('accessToken', '/');
            done();
        });
    });

  describe("POST /kyc/user/create", () => {
    it("It should return an ok if signup is successful", (done) => {
        const userDetails = {
            phoneNumber: "+254720123456"
        };
        chai.request(server)                
            .post("/kyc/user/create")
            .send(userDetails)
            .end((err, res) => {
                res.should.have.status(201); 
                res.body.should.be.a('object');
                res.body.should.have.property('userId').eq('668213f2fb5a177d6ef2aabcb77f1631e4eb9780');
            done();
        });
    });
  });
});
