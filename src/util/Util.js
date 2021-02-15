import request from "request";

export const httpGet = (route) => {
  return new Promise(function (resolve, reject) {
    request.get(route, (er, res, body) => {
      if (er) return reject(er);
      body = JSON.parse(body);
      return resolve(body);
    });
  });
};

export const getNormalGasPrice = () => {
  return httpGet("https://www.etherchain.org/api/gasPriceOracle").then(result => {
    return result.standard * 1000000000;
  });
};
