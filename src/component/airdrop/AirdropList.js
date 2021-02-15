import React, {Component} from 'react';
import {Row, Col, Button, ButtonGroup} from 'reactstrap';
import InputField from '../../util/InputField';
import IconButton from '@material-ui/core/IconButton';
import PropTypes from 'prop-types';
import Papa from 'papaparse';
import Button2 from '@material-ui/core/Button';
import swal from "sweetalert2";
import Spinner from 'react-spinkit';

import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from 'web3'

import AirdropModal from './AirdropModal'

const supportedNetwork = {
  4: 'Ethereum Testnet Rinkeby',
  80001: 'Matic Mumbai Testnet',
}

const networkName = {
  1: 'Ethereum Mainnet',
  3: 'Ethereum Testnet Ropsten',
  4: 'Ethereum Testnet Rinkeby',
  5: 'Ethereum Testnet Goerli',
  42: 'Ethereum Testnet Kovan',
  80001: 'Matic Mumbai Testnet',
  137: 'Matic Mainnet'
}

class AirdropList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      address: '',
      amount: 0,
      
      erc20Address: '',
      errorErc20Address: '',
  
      errorAddress: '',
      errorAmount: '',
      errorWMax: '',
      
      airdroplist: [],
      spinnerShow: false,
  
      showModal: false,
      resourceHandleErr: false,
      isProcessing: false,
    };
    this.web3 = null
    this.airdropAddress = null
  }

  componentDidMount() {
    this.web3 = new Web3(window.ethereum);
    this.getAccounts()
      .then((accounts) => {
        console.log(accounts);
        window.ethereum.request({ method: 'eth_chainId' })
          .then(network => {
            console.log(network);
            if (Number(network) === 4) {
              this.airdropAddress = process.env.REACT_APP_AIRDROP_CONTRACT_RINKEBY
            } else if (Number(network) === 80001) {
              this.airdropAddress = process.env.REACT_APP_AIRDROP_CONTRACT_MATIC_TESTNET
            } else {

            }
            console.log(this.airdropAddress);
          })
      })
  }

  async getAccounts() {
    return new Promise((resolve, reject) => {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then(accounts => {
          if (!accounts || !accounts[0]) {
            swal(`Metamask is locked`, 'Please unlock Metamask and refresh the page');
            return resolve(null)  
          }
          this.web3.eth.defaultAccount = accounts[0]
          return resolve(accounts)
        })
        .catch(err => {
          swal(`Metamask is locked`, 'Please unlock Metamask and refresh the page');
          return reject(err)
        })
    })
  }

  async checkNetwork() {
    try {
      const network = await window.ethereum.request({ method: 'eth_chainId' }).then(res => Number(res))
      if (!supportedNetwork[network]) {
        swal(`Please use ${Object.values(supportedNetwork)[0]} or ${Object.values(supportedNetwork)[1]}`, `Your current Metamask network (${networkName[network]}) is not supported.`, "warning");
        return null
      } else {
        return networkName[network]
      }
    } catch (e) {
      swal(`Metamask is locked`, 'Please unlock Metamask and refresh the page');
      return null
    }
  }

  handleChange = (name, value) => {
    this.setState({
      [name]: value,
    })
  };

  handleBlurAddress = () => {
    const address = this.state.address;
    let errorAddress = '';
    if (address === '' || !this.web3.utils.isAddress(address))
      errorAddress = 'The inserted address is invalid';
    else
      errorAddress = '';
    this.setState({
      errorAddress,
    });
  };

  handleBlurERC20Address = () => {
    const address = this.state.erc20Address;
    let errorAddress = '';
    if (address === '' || !this.web3.utils.isAddress(address))
      errorAddress = 'The inserted address is invalid';
    else
      errorAddress = '';
    this.setState({
      errorErc20Address: errorAddress,
    });
  };

  handleBlurAmount = () => {
    const amount = parseFloat(this.state.amount);

    this.setState({
      errorAmount: amount <= 0 ? 'Please enter a valid number greater than 0' : ''
    });
  };

  handleAddNew = () => {
    const address = this.state.address;
    const amount = parseFloat(this.state.amount);
    let errorAddress = '';
    let errorAmount = '';

    let hasError = false;
    if (address === '' || !this.web3.utils.isAddress(address)) {
      errorAddress = 'The inserted address is invalid';
      hasError = true;
    } else
      errorAddress = '';

    if (amount <= 0) {
      errorAmount = 'Please enter a valid number greater than 0';
      hasError = true;
    } else
      errorAmount = '';

    this.setState({
      errorAddress,
      errorAmount
    });

    if (!hasError) {
      this.setState({
        airdroplist: [...this.state.airdroplist, {address, amount}]
      })
    }
  };

  handleUploadCSV = event => {
    const file = event.target.files[0];
    if (file) {
      let fileReader = new FileReader();
      fileReader.onloadend = (e) => {
        this.setState({
          airdroplist: []
        })
        let csv = Papa.parse(fileReader.result);
        let airdroplist = [];
        for (const idx in csv.data) {
          let addr = csv.data[idx][0]
          let amount = parseFloat(csv.data[idx][1])
          if (this.web3.utils.isAddress(addr) && amount > 0) {
            airdroplist.push({address: addr, amount: amount});
          }
        }
        this.setState({
          airdroplist
        });
      };
      fileReader.readAsText(file);
      event.target.value = null;
    }
  };

  airdropWithMetamask = () => {
    this.getAccounts().then(res => {
      if (!res) {
        window.location.reload()
        return
      }
      this.checkNetwork().then(res => {
        console.log('airdropWithMetamask:', res);
        if (res) {
          this.handleToggleModal()
        }
      })
    })
  }

  handleToggleModal = () => {
    const { showModal } = this.state
    this.setState({
      showModal: !showModal,
      resourceHandleErr: false,
      isProcessing: false
    })
  }

  setResourceHandleErr = (val) => {
    this.setState({
      resourceHandleErr: val
    })
  }

  setIsProcessing = (val) => {
    this.setState({
      isProcessing: val
    })
  }
  
  render() {
    return (
      <div>
        <AirdropModal
          web3 = {this.web3 || new Web3(window.ethereum)}
          checkNetwork = {this.checkNetwork}
          showModal={this.state.showModal}
          handleToggleModal={this.handleToggleModal}
          setResourceHandleErr={this.setResourceHandleErr}
          resourceHandleErr={this.state.resourceHandleErr}
          setIsProcessing={this.setIsProcessing}
          isProcessing={this.state.isProcessing}

          erc20Address={this.state.erc20Address}
          airdropAddress={this.airdropAddress}

          airdroplist={this.state.airdroplist}

          radioSelected={this.props.radioSelected}
        />
        <div className='container step-widget widget-1'>
          <div className='widget-header'>
            <div>
              <p className='title'>Airdrop Tool</p>
              <p className='description'>
                This tool is used to airdrop a specified ERC20 token to multiple wallet addresses that are provided by uploading a CSV file or by adding manually.
              </p>
              <p className='description'>
                Please ensure that the connected Metamask wallet owns the ERC20 tokens.
              </p>
              <br />
              <p className='description'>
                <b> Supported networks are:</b>
                  <ul>
                    {Object.values(supportedNetwork).map(net => <li>{net}</li>)}
                  </ul>
              </p>
            </div>
          </div>
          {
            this.state.spinnerShow ?
              <div>
                <Spinner 
                  className='justify-content-center align-items-center mx-auto' 
                  name='three-bounce' color='#00B1EF' style={{ width: 100, margin: 250 }}
                  noFadeIn
                />
              </div>
              :
              <div className='wg-content'>
                <div>
                  <Row>
                    <Col md={5}>
                      <InputField id='erc20Address' nameLabel='ERC20 Token Address' tooltip='This is the address of the token for airdrop' type='text' onChange={this.handleChange} value={this.state.erc20Address}
                                  onBlur={this.handleBlurERC20Address} hasError={this.state.errorErc20Address}/>
                    </Col>
                  </Row>
                </div>
                <br></br>
                <div>
                  <p className='wg-label fs-22px'>Recipient List</p>
                  <Row>
                    <Col md={5}>
                      <InputField id='address' nameLabel='Address' type='text' onChange={this.handleChange} value={this.state.address}
                                  onBlur={this.handleBlurAddress} hasError={this.state.errorAddress}/>
                    </Col>
                    <Col md={3}>
                      <InputField id='amount' nameLabel='Amount' type='number' onChange={this.handleChange} value={this.state.amount}
                                  onBlur={this.handleBlurAmount} hasError={this.state.errorAmount}/>
                    </Col>
                    <Col md={1}>
                      <IconButton component='span' className='add-whitelist' onClick={this.handleAddNew}><i className='fas fa-plus'/></IconButton>
                    </Col>
                  </Row>
                </div>
                <Row>
                  <Col>
                    <input id='upload-csv' className='upload-csv' multiple type='file' accept=".csv" onChange={this.handleUploadCSV}/>
                    <label htmlFor='upload-csv'>
                      <Button2 variant="contained" component='span' className='upload-btn'>
                        <i className='fas fa-upload'/>
                        &nbsp; Upload CSV
                      </Button2>
                    </label>
                  </Col>
                  <Col>
                    <a href='/airdrop_sample.csv'>Download Sample CSV</a>
                  </Col>
                </Row>
                <br></br>
                {
                  this.state.airdroplist.length !== 0 &&
                  <div>
                    <table className='table table-striped table-bordered'>
                      <thead>
                      <tr>
                        <th>Address</th>
                        <th>Amount</th>
                      </tr>
                      </thead>
                      <tbody>
                      {
                        this.state.airdroplist.map((val, key) => (
                          <tr key={key}>
                            <td>{val.address}</td>
                            <td>{val.amount}</td>
                          </tr>
                        ))
                      }
                      </tbody>
                    </table>
                    <Row>
                      <Col className='float-left'>
                        <Button
                          onClick={this.airdropWithMetamask}
                          variant='contained' size='large' color="primary"
                        >
                            Airdrop with Metamask
                        </Button>
                      </Col>
                      { this.state.doneShow &&
                          <Col className='float-right' md={4}>
                            <Button
                              onClick={this.onDone}
                              variant='contained' size='large' color="primary"
                            >
                                Done
                            </Button>
                          </Col>
                      }
                    </Row>
                  </div>
                }
              </div>
          }
        </div>
      </div>
    );
  }
}

AirdropList.propTypes = {
  id: PropTypes.number.isRequired,
};

export default AirdropList;