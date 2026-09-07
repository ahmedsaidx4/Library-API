const EventEmitter = require("events");

const myEmitter = new EventEmitter();

myEmitter.on("userRegisterSuccessFul", (user) => {
  console.log(`register User:  ${user}`);
});
myEmitter.on("userLoginSuccessFul", (user) => {
  console.log(`Login User:  ${user}`);
});
module.exports = {
  myEmitter,
};
