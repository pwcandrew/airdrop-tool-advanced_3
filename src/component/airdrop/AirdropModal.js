import React, { Component } from 'react'
import {
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  Collapse,
  Alert,
  Row, Col
} from 'reactstrap'
import Spinner from 'react-spinkit'
import swal from "sweetalert2";
import BigNumber from "bignumber.js";
import {getNormalGasPrice} from "../../util/Util";

import AIRDROP_CONTRACT from '../../artifacts/Airdrop';

const BATCH_SIZE_MAX = process.env.REACT_APP_BATCH_SIZE_MAX;


const GASLIMIT = process.env.REACT_APP_GASLIMIT

class AirdropModalContainer extends Component {
  constructor (props) {
    super(props)
    
    this.state = {
      tokenInfo: {},

      airdropAddressBatch: [],
      airdropAmountBatch: [],
      airdropTokenAmount: 0,
      airdropReceiverAmount: 0,
      gasPrice: 0,

      metamaskNet: ''
    }

    this.erc20ContractInst = null
    this.erc20ABI = null
  }

  handleAirdropWithMetaMask = () => {
    let {tokenInfo, airdropTokenAmount, airdropAddressBatch, airdropAmountBatch} = this.state

    console.log('airdropAddressBatch:', airdropAddressBatch);
    console.log('airdropAmountBatch:', airdropAmountBatch);

    if (!tokenInfo) {
      swal(`Metamask is locked`, 'Please unlock Metamask and refresh the page');
      return
    }

    if (!tokenInfo.name || tokenInfo.name === '' || isNaN(tokenInfo.userBalance)) {
      swal('Error', `The specified token does not exist on ${this.state.metamaskNet}`)
      return
    }
    
    // Check if user has enough tokens for airdrop
    if (parseFloat(airdropTokenAmount) > parseFloat(tokenInfo.userBalance)) {
      swal('Error', 'Not enough tokens for doing airdrop')
      return
    }

    this.props.setIsProcessing(true)
    this.props.setResourceHandleErr(false)

    this.approveAndDoAirdrop()
  }

  getAllowance = () => {
    let {tokenInfo} = this.state
    let instance = this.erc20ContractInst

    return instance.methods.allowance(this.props.web3.eth.defaultAccount, this.props.airdropAddress).call().then(res => Number(res)).catch(() => null)
  };

  doAirdrop = async (erc20Address, addresses, amounts) => {
    const {web3, airdropAddress} = this.props
    const instance = new web3.eth.Contract(AIRDROP_CONTRACT.abi, airdropAddress);
  
    const amountsBigNum = amounts.map(a => BigNumber(a))

    console.log('doAirdrop - erc20Address:', erc20Address, ', airdropAddress:', airdropAddress, ', addresses:', addresses, ', amounts:', amounts);
    
    return new Promise((resolve, reject) => {
      instance.methods.doAirDrop(erc20Address, amountsBigNum, addresses)
        .send({from: web3.eth.defaultAccount, gas: process.env.REACT_APP_GASLIMIT})
          .on('transactionHash', (transactionHash) => {
            console.log('doAirDrop - tx:', transactionHash);
            return resolve(transactionHash)
          })
          .on('error', (error => {
            return reject(error)
          }))
      })
  };

  approveAndDoAirdrop = () => {
    let {tokenInfo, airdropTokenAmount, gasPrice, airdropAddressBatch, airdropAmountBatch} = this.state
    let instance = this.erc20ContractInst
    
    airdropTokenAmount *= 10**tokenInfo.decimals
    this.getAllowance()
      .then(allowance => {
        // if (!allowance) return
        console.log('approveAndDoAirdrop - Current allowance:', allowance);

        instance.methods.approve(this.props.airdropAddress, BigNumber(0))
          .send({from: this.props.web3.eth.defaultAccount})
            .on('transactionHash', (transactionHash) => {
              console.log('approveAndDoAirdrop for allowance 0, tx:', transactionHash);
              instance.methods.approve(this.props.airdropAddress, BigNumber(airdropTokenAmount))
            .send({from: this.props.web3.eth.defaultAccount})
              .on('transactionHash', (transactionHash) => {
                console.log('approveAndDoAirdrop for allowance:', airdropTokenAmount, ', tx:', transactionHash);
              
                this.doAirdrop(tokenInfo.address, airdropAddressBatch[0], airdropAmountBatch[0])
                  .then(res => {
                    this.props.setIsProcessing(false)
                    this.props.setResourceHandleErr('Success')
                  })
                  .catch(err => {
                    console.log('doAirdrop - Error:', err);
                    this.props.setIsProcessing(false)
                    this.props.setResourceHandleErr('Failure')
                  })
              })
              .on('error', (error) => console.error)
            })
            .on('error', (error) => console.error)

      });
  }

  getERC20TokenDetails = async (erc20Address) => {

    try {
      this.erc20ContractInst = new this.props.web3.eth.Contract(this.erc20ABI, erc20Address)
      console.log('erc20Address:', erc20Address);

      let instance = this.erc20ContractInst
      const name = await instance.methods.name().call()
      console.log(name);

      const symbol = await instance.methods.symbol().call()
      console.log(symbol);

      const decimals = await instance.methods.decimals().call()
      console.log(decimals);

      const userBalance = await instance.methods.balanceOf(this.props.web3.eth.defaultAccount).call()
      console.log(userBalance);

      return {
        name,
        symbol,
        decimals,
        userBalance: Number(userBalance) / 10**Number(decimals),
      };
    } catch (err) {
      swal(`Metamask is locked`, 'Please unlock Metamask and refresh the page');
      return null
    }
  }

  componentWillReceiveProps(nextProps) {
    const {web3} = this.props
    if (this.props.erc20Address !== nextProps.erc20Address) {
      let erc20Address = nextProps.erc20Address
      // console.log('erc20Address:', erc20Address);
      if (erc20Address && web3.utils.isAddress(erc20Address)) {
        console.log('componentWillReceiveProps');
        this.getERC20TokenDetails(erc20Address, this.props.web3.eth.defaultAccount)
          .then(tokenInfo => {
            if (!tokenInfo) {
              return
            }
            console.log(tokenInfo);
            tokenInfo.address = erc20Address
            this.setState({
              tokenInfo
            })

            getNormalGasPrice().then(gasPrice => {
              console.log('gasPrice:', gasPrice);
              this.setState({
                gasPrice
              })
            })
          })
      }
    }

    if (this.props.airdroplist !== nextProps.airdroplist) {
      let airdroplist = nextProps.airdroplist
      // console.log('airdroplist:', airdroplist);
      let airdropTokenAmount = 0
      
      let airdropAddressBatch = []
      let airdropAddressBatchEntry = []

      let airdropAmountBatch = []
      let airdropAmountBatchEntry = []

      for (let i=0; i<airdroplist.length; i++) {
        let airdropListEntry = airdroplist[i]
        // console.log('airdropListEntry:', airdropListEntry);
        airdropTokenAmount += parseFloat(airdropListEntry.amount)

        if (airdropAddressBatchEntry.length >= BATCH_SIZE_MAX) {
          airdropAddressBatch.push(airdropAddressBatchEntry)
          airdropAmountBatch.push(airdropAmountBatchEntry)

          airdropAddressBatchEntry = []
          airdropAmountBatchEntry = []
        }

        airdropAddressBatchEntry.push(airdropListEntry.address)
        airdropAmountBatchEntry.push(airdropListEntry.amount * (10**this.state.tokenInfo.decimals))
      }

      airdropAddressBatch.push(airdropAddressBatchEntry)
      airdropAmountBatch.push(airdropAmountBatchEntry)

      this.setState({
        airdropAddressBatch,
        airdropAmountBatch,
        airdropTokenAmount,
        airdropReceiverAmount: airdroplist.length
      })
    }
  }

  async componentDidMount() {
    let {web3, erc20Address} = this.props
    this.erc20ABI = await (await fetch("./erc20.abi.json")).json();
    this.networkName = await this.props.checkNetwork()
  }

  render () {
    const { tokenInfo, airdropTokenAmount, airdropReceiverAmount } = this.state
    const { showModal, isProcessing, handleToggleModal, erc20Address, resourceHandleErr } = this.props
    
    return (
      <div>
        <Modal
          isOpen={showModal}
          className={this.props.className}
          size='lg'
        >
          <ModalHeader toggle={handleToggleModal}>
            <div>Please confirm the following Airdrop </div>
          </ModalHeader>
          <ModalBody>
            <div>
              <Collapse isOpen={resourceHandleErr !== false} size='sm'>
                {resourceHandleErr === 'Success' ? (
                  <Alert color='success'>
                    <div>
                      <div>
                        <b>Airdrop done! Please check transactions on your Metamask</b>
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert color='danger'>{resourceHandleErr}</Alert>
                )}
              </Collapse>
            </div>
            {tokenInfo && <div>
              <ul>
                <li>
                  <b> Token info </b>
                    <ul>
                      <li>
                        Address: {tokenInfo.address}
                      </li>
                      <li>
                        Name: {tokenInfo.name}
                      </li>
                      <li>
                        Symbol: {tokenInfo.symbol}
                      </li>
                      <li>
                        Decimals: {tokenInfo.decimals}
                      </li>
                    </ul>
                </li>
                <li>
                  <b> Airdrop token amount: </b> {new Intl.NumberFormat().format(airdropTokenAmount)}
                </li>
                <li>
                  <b> Airdrop receiver amount: </b> {new Intl.NumberFormat().format(airdropReceiverAmount)}
                </li>
                <li>
                  <b> Your current token balance: </b> {new Intl.NumberFormat().format(tokenInfo.userBalance)}
                </li>
                <li>
                  <b> Your current account address: </b> {this.props.web3.eth.defaultAccount}
                </li>
                <li>
                  <b> Your current network: </b> {this.networkName}
                </li>
              </ul>
            </div>}
            <div>
              <Row>
                <Col className='float-left'>
                  <Button
                    color='primary'
                    onClick={() => {this.handleAirdropWithMetaMask()}}
                  >
                    {isProcessing ?
                      <Spinner
                        name='three-bounce'
                        color='white'
                        fadeIn='none'
                      />
                      : 
                      <span>Submit</span>
                    }
                  </Button>
                </Col>
                <Col className='float-right'>
                  <Button
                    color='secondary'
                    onClick={handleToggleModal}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </div>
          </ModalBody>
        </Modal>
      </div>
    )
  }
}

export default AirdropModalContainer;