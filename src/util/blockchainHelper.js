import swal from "sweetalert2";
import Web3 from "web3";

import {getNormalGasPrice} from "./Util";

import AIRDROP_CONTRACT from '../artifacts/Airdrop';

let web3 = null;
let airdropContract = null

if (typeof(window.web3) !== 'undefined') {
  web3 = new Web3(window.web3.currentProvider);
  airdropContract = web3.eth.contract(AIRDROP_CONTRACT.abi);
}

export const getMetamaskAddress = () => {
  let addr = web3 !== null ? web3.eth.accounts[0] : null
  console.log(`getMetamaskAddress: ${addr}`);
  return addr
};

export const formatAddress = (addr) => {
  return (addr.substring(0,20) + '...')
}

export const isValidAddress = (address) => {
  return web3.isAddress(address);
};

export const preCheckMetaMask = async () => {
  if (!web3) {
    swal("Metamask is not available. Please install Metamask extension and sign in.", "", "warning");
  }

  const isMetamaskApproved = await window.ethereum._metamask.isApproved();
  if (!isMetamaskApproved) {
    try {
      await window.ethereum.enable();
    } catch (e) {
      // User denied access
      swal("Please allow Metamask", "", "warning");
      return;
    }
  }
  
  // console.log('web3.version:', web3.version.network);

  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      swal("Cannot access Metamask account", "", "warning");
    }
    if (accounts.length === 0) {
      swal("Please sign in Metamask account", "", "warning");
    } else {
      console.log(`preCheckMetaMask - OK (current account:${accounts[0]})`);
    }
  })
}

export const getNetworkName = () => {
  
  let networkId = web3.version.network
  let networkName = ""

  switch (networkId) {
    case "1":
      networkName = "Mainnet";
      break;
    case "2":
    networkName = "Morden";
    break;
    case "3":
      networkName = "Ropsten";
      break;
    case "4":
      networkName = "Rinkeby";
      break;
    case "42":
      networkName = "Kovan";
      break;
    default:
      networkName = "Unknown";
  }

  return networkName
}

export const doAirdrop = (erc20Address, airdropAddress, addresses, amounts) => {
  const instance = airdropContract.at(airdropAddress);

  const gasOpt = {
    from: getMetamaskAddress()
  };
  
  console.log('doAirdrop - erc20Address:', erc20Address, ', airdropAddress:', airdropAddress, ', addresses:', addresses, ', amounts:', amounts, ', gasOpt:', gasOpt);
  
  return new Promise((resolve, reject) => instance.doAirDrop(erc20Address, amounts, addresses, gasOpt, (err, res) => {
    if (err) return reject(err);
    else return resolve(res);
  }));
};
